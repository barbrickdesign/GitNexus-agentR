/**
 * Link Chains — Cross-repo link discovery and agent prompt generation.
 *
 * Analyzes indexed repositories (individually or via a group) to find:
 *   1. Functions/APIs exported by one repo that are semantically compatible
 *      with what another repo needs.
 *   2. Types and interfaces in one repo that another repo could extend/reuse.
 *   3. Modules in one repo that provide functionality a second repo currently
 *      reimplements locally.
 *
 * For each discovered link opportunity, generates a GitHub agent prompt
 * describing the integration work needed to bring the two codebases together.
 *
 * This module is intentionally stateless: it accepts pre-resolved repo queries
 * via the GroupToolPort and operates purely on the query results.
 */

import type { GroupToolPort, GroupRepoHandle } from './service.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LinkEndpoint {
  repo: string;
  symbolName: string;
  filePath: string;
  kind: string; // 'Function' | 'Class' | 'Interface' | 'Module' | 'Method' | etc.
  description?: string;
}

export interface LinkChain {
  /** Type of relationship that makes these repos compatible */
  linkType: 'reuse' | 'extension' | 'replacement' | 'dependency' | 'api-compatibility';
  /** Confidence score for this link (0–1) */
  confidence: number;
  /** The symbol/pattern in the provider repo that could be used */
  provider: LinkEndpoint;
  /** The symbol/pattern in the consumer repo that would benefit */
  consumer: LinkEndpoint;
  /** Human-readable explanation of why these are linked */
  rationale: string;
  /** Ready-to-use GitHub agent prompt for implementing this integration */
  agentPrompt: string;
}

export interface LinkChainsResult {
  /** Repos analyzed */
  repos: string[];
  /** Discovered link opportunities */
  links: LinkChain[];
  /** High-level summary for the agent */
  summary: string;
  /** Suggested next steps */
  nextSteps: string[];
}

export interface LinkChainsParams {
  /** Group name — when provided, queries all repos in the group */
  group?: string;
  /** Specific repo names to compare (overrides group) */
  repos?: string[];
  /** Maximum number of link recommendations to return (default: 20) */
  maxLinks?: number;
  /** Minimum confidence threshold (0–1, default: 0.4) */
  minConfidence?: number;
  /** Focus area: 'all' | 'functions' | 'types' | 'modules' (default: 'all') */
  focus?: 'all' | 'functions' | 'types' | 'modules';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract a list of exported symbol rows from a query result. */
function extractSymbols(queryResult: unknown): Array<{
  name: string;
  kind: string;
  filePath: string;
  description?: string;
}> {
  if (!queryResult || typeof queryResult !== 'object') return [];

  const result = queryResult as Record<string, unknown>;
  const symbols: Array<{ name: string; kind: string; filePath: string; description?: string }> = [];

  // Handle the query tool's { processes, process_symbols, definitions } shape
  const definitions = Array.isArray(result.definitions) ? result.definitions : [];
  for (const def of definitions) {
    if (!def || typeof def !== 'object') continue;
    const d = def as Record<string, unknown>;
    const name = typeof d.name === 'string' ? d.name : undefined;
    const kind = typeof d.kind === 'string' ? d.kind : 'Function';
    const filePath = typeof d.filePath === 'string' ? d.filePath : '';
    const description = typeof d.description === 'string' ? d.description : undefined;
    if (name) symbols.push({ name, kind, filePath, description });
  }

  // Also pick up symbols from process_symbols
  const processSymbols = Array.isArray(result.process_symbols) ? result.process_symbols : [];
  for (const ps of processSymbols) {
    if (!ps || typeof ps !== 'object') continue;
    const p = ps as Record<string, unknown>;
    const name = typeof p.name === 'string' ? p.name : undefined;
    const kind = typeof p.kind === 'string' ? p.kind : 'Function';
    const filePath = typeof p.filePath === 'string' ? p.filePath : '';
    if (name && !symbols.find((s) => s.name === name)) {
      symbols.push({ name, kind, filePath });
    }
  }

  return symbols;
}

/**
 * Compute a simple name-based similarity score between two symbol names.
 * Used as a fast pre-filter before semantic matching.
 */
function nameSimilarity(a: string, b: string): number {
  const aLow = a.toLowerCase();
  const bLow = b.toLowerCase();
  if (aLow === bLow) return 1.0;

  // Exact substring
  if (aLow.includes(bLow) || bLow.includes(aLow)) return 0.7;

  // Common word fragments — split camelCase before lowercasing to avoid missing boundaries
  const toWords = (s: string): string[] =>
    s
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .split(/[_\-]/)
      .filter((w) => w.length > 0);
  const aWords = toWords(a);
  const bWords = toWords(b);
  const commonWords = aWords.filter((w) => w.length > 3 && bWords.includes(w));
  if (commonWords.length > 0) return 0.4 + 0.1 * Math.min(commonWords.length, 3);

  return 0;
}

/**
 * Generate a GitHub agent prompt for integrating two compatible symbols.
 */
function generateAgentPrompt(chain: Omit<LinkChain, 'agentPrompt'>): string {
  const { linkType, provider, consumer, rationale } = chain;

  const actionVerbs: Record<typeof linkType, string> = {
    reuse: 'reuse',
    extension: 'extend',
    replacement: 'replace',
    dependency: 'add as a dependency',
    'api-compatibility': 'integrate with',
  };

  const verb = actionVerbs[linkType] ?? 'integrate with';

  return `## Integration: ${consumer.repo} → ${provider.repo}

**Task:** ${consumer.repo} should ${verb} \`${provider.symbolName}\` from ${provider.repo}.

**Context:**
- **Provider:** \`${provider.symbolName}\` (${provider.kind}) in \`${provider.repo}\` at \`${provider.filePath}\`
- **Consumer:** \`${consumer.symbolName}\` (${consumer.kind}) in \`${consumer.repo}\` at \`${consumer.filePath}\`
- **Rationale:** ${rationale}

**Steps to implement:**
1. Run \`gitnexus_context({name: "${provider.symbolName}", repo: "${provider.repo}"})\` to understand the provider's full interface
2. Run \`gitnexus_impact({target: "${consumer.symbolName}", direction: "upstream", repo: "${consumer.repo}"})\` to understand what currently depends on the consumer
3. Evaluate if \`${provider.repo}\` can be added as a shared library or if the code should be copied/adapted
4. If shared library: add \`${provider.repo}\` as a dependency in \`${consumer.repo}\`'s package manifest, then replace usages
5. If code copy: copy and adapt \`${provider.symbolName}\` into \`${consumer.repo}\`, keeping the same interface
6. Run \`gitnexus_detect_changes({scope: "all", repo: "${consumer.repo}"})\` to verify no unexpected side effects
7. Write tests covering the integration point

**Expected outcome:** \`${consumer.repo}\` benefits from ${provider.repo}'s \`${provider.symbolName}\` implementation, reducing duplication and improving maintainability.`;
}

// ── Core algorithm ────────────────────────────────────────────────────────────

/**
 * Find link chain opportunities between two repos.
 * Returns pairs of (provider symbol, consumer symbol) with similarity scores.
 */
function findLinksBetweenRepos(
  providerRepo: string,
  providerSymbols: ReturnType<typeof extractSymbols>,
  consumerRepo: string,
  consumerSymbols: ReturnType<typeof extractSymbols>,
  focus: 'all' | 'functions' | 'types' | 'modules',
  minConfidence: number,
): LinkChain[] {
  const chains: LinkChain[] = [];

  // Filter by focus area
  const functionKinds = new Set(['Function', 'Method', 'Constructor']);
  const typeKinds = new Set(['Class', 'Interface', 'Type', 'Struct', 'Enum', 'Trait', 'TypeAlias']);
  const moduleKinds = new Set(['Module', 'Namespace', 'Package']);

  const shouldInclude = (kind: string): boolean => {
    if (focus === 'all') return true;
    if (focus === 'functions') return functionKinds.has(kind);
    if (focus === 'types') return typeKinds.has(kind);
    if (focus === 'modules') return moduleKinds.has(kind);
    return true;
  };

  const filteredProvider = providerSymbols.filter((s) => shouldInclude(s.kind));
  const filteredConsumer = consumerSymbols.filter((s) => shouldInclude(s.kind));

  // For each consumer symbol, find the best matching provider symbol
  for (const consumer of filteredConsumer) {
    let bestScore = 0;
    let bestProvider: (typeof filteredProvider)[0] | null = null;

    for (const provider of filteredProvider) {
      // Skip same-kind+same-name in trivial cases unless repos differ meaningfully
      const score = nameSimilarity(consumer.name, provider.name);
      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    if (!bestProvider || bestScore < minConfidence) continue;

    // Determine link type from similarity and kind
    let linkType: LinkChain['linkType'] = 'reuse';
    if (
      typeKinds.has(consumer.kind) &&
      (typeKinds.has(bestProvider.kind) || moduleKinds.has(bestProvider.kind))
    ) {
      linkType = 'extension';
    } else if (bestScore >= 0.9) {
      linkType = 'replacement';
    } else if (functionKinds.has(consumer.kind) && functionKinds.has(bestProvider.kind)) {
      linkType = 'reuse';
    } else if (moduleKinds.has(bestProvider.kind)) {
      linkType = 'dependency';
    }

    const rationale = buildRationale(linkType, consumer, bestProvider, providerRepo, consumerRepo);

    const chainBase: Omit<LinkChain, 'agentPrompt'> = {
      linkType,
      confidence: bestScore,
      provider: {
        repo: providerRepo,
        symbolName: bestProvider.name,
        filePath: bestProvider.filePath,
        kind: bestProvider.kind,
        description: bestProvider.description,
      },
      consumer: {
        repo: consumerRepo,
        symbolName: consumer.name,
        filePath: consumer.filePath,
        kind: consumer.kind,
        description: consumer.description,
      },
      rationale,
    };

    chains.push({
      ...chainBase,
      agentPrompt: generateAgentPrompt(chainBase),
    });
  }

  // Sort by confidence descending
  return chains.sort((a, b) => b.confidence - a.confidence);
}

function buildRationale(
  linkType: LinkChain['linkType'],
  consumer: ReturnType<typeof extractSymbols>[0],
  provider: ReturnType<typeof extractSymbols>[0],
  providerRepo: string,
  consumerRepo: string,
): string {
  switch (linkType) {
    case 'replacement':
      return `\`${consumerRepo}/${consumer.name}\` and \`${providerRepo}/${provider.name}\` appear to be equivalent implementations. ${consumerRepo} could adopt ${providerRepo}'s version to eliminate duplication.`;
    case 'extension':
      return `\`${consumerRepo}/${consumer.name}\` (${consumer.kind}) could extend or implement \`${providerRepo}/${provider.name}\` (${provider.kind}), establishing a shared type contract.`;
    case 'dependency':
      return `\`${consumerRepo}\` uses \`${consumer.name}\` functionality that is already provided by the \`${provider.name}\` module in \`${providerRepo}\`. Adding \`${providerRepo}\` as a dependency would avoid reimplementing this logic.`;
    case 'reuse':
    default:
      return `\`${providerRepo}/${provider.name}\` provides functionality that \`${consumerRepo}/${consumer.name}\` could reuse, reducing code duplication and improving cross-project consistency.`;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Discover link chain opportunities across multiple repos.
 *
 * Queries each repo's symbol graph, finds semantic compatibility between
 * exported symbols, and returns structured recommendations plus ready-to-use
 * GitHub agent prompts for implementing each integration.
 */
export async function discoverLinkChains(
  repos: GroupRepoHandle[],
  port: GroupToolPort,
  params: LinkChainsParams,
): Promise<LinkChainsResult> {
  const maxLinks = params.maxLinks ?? 20;
  const minConfidence = params.minConfidence ?? 0.4;
  const focus = params.focus ?? 'all';

  if (repos.length < 2) {
    return {
      repos: repos.map((r) => r.name),
      links: [],
      summary: 'At least two repos are required to discover link chains.',
      nextSteps: [
        'Index more repositories with `npx gitnexus analyze`',
        'Create a group.yaml to define a multi-repo group',
      ],
    };
  }

  // Query each repo for its exported/important symbols
  const repoSymbolMap = new Map<string, ReturnType<typeof extractSymbols>>();

  await Promise.all(
    repos.map(async (repo) => {
      try {
        const result = await port.query(repo, {
          query: 'exported public functions types modules interfaces',
          goal: 'find reusable cross-repo symbols',
          limit: 50,
          max_symbols: 100,
        });
        repoSymbolMap.set(repo.name, extractSymbols(result));
      } catch {
        repoSymbolMap.set(repo.name, []);
      }
    }),
  );

  // Find links between every pair of repos (bidirectional)
  const allChains: LinkChain[] = [];
  const repoNames = repos.map((r) => r.name);

  for (let i = 0; i < repoNames.length; i++) {
    for (let j = i + 1; j < repoNames.length; j++) {
      const firstRepo = repoNames[i]!;
      const secondRepo = repoNames[j]!;
      const symbolsFirst = repoSymbolMap.get(firstRepo) ?? [];
      const symbolsSecond = repoSymbolMap.get(secondRepo) ?? [];

      // first as provider, second as consumer
      const chainsFirstToSecond = findLinksBetweenRepos(
        firstRepo,
        symbolsFirst,
        secondRepo,
        symbolsSecond,
        focus,
        minConfidence,
      );
      // second as provider, first as consumer
      const chainsSecondToFirst = findLinksBetweenRepos(
        secondRepo,
        symbolsSecond,
        firstRepo,
        symbolsFirst,
        focus,
        minConfidence,
      );

      allChains.push(...chainsFirstToSecond, ...chainsSecondToFirst);
    }
  }

  // Deduplicate: remove mirror duplicates (A→B vs B→A for same symbol pair)
  const seen = new Set<string>();
  const dedupedChains: LinkChain[] = [];
  for (const chain of allChains) {
    const key = [
      chain.provider.symbolName,
      chain.consumer.symbolName,
      chain.provider.repo,
      chain.consumer.repo,
    ]
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      dedupedChains.push(chain);
    }
  }

  // Sort by confidence and take top maxLinks
  const topChains = dedupedChains
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxLinks);

  // Build summary and next steps
  const highConfidence = topChains.filter((c) => c.confidence >= 0.7).length;
  const medConfidence = topChains.filter((c) => c.confidence >= 0.5 && c.confidence < 0.7).length;

  const summary = buildSummary(repoNames, topChains, highConfidence, medConfidence);
  const nextSteps = buildNextSteps(topChains, repoNames);

  return {
    repos: repoNames,
    links: topChains,
    summary,
    nextSteps,
  };
}

function buildSummary(
  repos: string[],
  chains: LinkChain[],
  highConfidence: number,
  medConfidence: number,
): string {
  if (chains.length === 0) {
    return `No link chain opportunities found between ${repos.join(', ')}. The repos may be independent, or try re-indexing with embeddings enabled (\`npx gitnexus analyze --embeddings\`) for deeper semantic matching.`;
  }

  const repoList = repos.length <= 3 ? repos.join(', ') : `${repos.slice(0, 3).join(', ')} and ${repos.length - 3} more`;

  return (
    `Found ${chains.length} link chain ${chains.length === 1 ? 'opportunity' : 'opportunities'} across ${repos.length} repos (${repoList}). ` +
    `${highConfidence} high-confidence (≥70%) and ${medConfidence} medium-confidence (50–70%) links discovered. ` +
    `Use the \`agentPrompt\` field of each link to guide a GitHub agent through the integration work.`
  );
}

function buildNextSteps(chains: LinkChain[], repos: string[]): string[] {
  const steps: string[] = [];

  if (chains.length === 0) {
    steps.push(`Ensure all repos are indexed: run \`npx gitnexus analyze\` in each repo directory`);
    steps.push(`Create a group.yaml to link repos: \`group_sync({name: "myGroup"})\``);
    return steps;
  }

  const topChain = chains[0];
  if (topChain) {
    steps.push(
      `Review the top link: \`${topChain.provider.repo}/${topChain.provider.symbolName}\` → \`${topChain.consumer.repo}/${topChain.consumer.symbolName}\` (confidence: ${(topChain.confidence * 100).toFixed(0)}%)`,
    );
    steps.push(
      `Use gitnexus_context() on \`${topChain.provider.symbolName}\` in ${topChain.provider.repo} to understand its full interface before integrating`,
    );
  }

  const replacements = chains.filter((c) => c.linkType === 'replacement');
  if (replacements.length > 0) {
    steps.push(
      `${replacements.length} potential duplicate implementation${replacements.length > 1 ? 's' : ''} found — consolidating these would reduce maintenance burden`,
    );
  }

  const reposWithLinks = new Set(chains.flatMap((c) => [c.provider.repo, c.consumer.repo]));
  if (reposWithLinks.size === repos.length) {
    steps.push(`All ${repos.length} repos have integration opportunities — consider creating a shared library or monorepo structure`);
  }

  steps.push(`To implement: copy the \`agentPrompt\` from any link and paste it to a GitHub Copilot agent in the consumer repo`);

  return steps;
}
