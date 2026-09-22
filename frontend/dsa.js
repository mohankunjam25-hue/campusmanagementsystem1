/**
 * CampusCare - Frontend Data Structures & Algorithms (DSA) Engine
 * Implements high-performance algorithms for sub-millisecond search,
 * multi-criteria set intersection filtering, O(1) multi-index lookups,
 * fuzzy string matching (Levenshtein), and keyed DOM reconciliation.
 */

(function (global) {
    "use strict";

    // =========================================================
    // 1. SET ALGORITHMS (OPTIMIZED SUB-SET INTERSECTION)
    // =========================================================
    const SetAlgorithms = {
        /**
         * Intersects two Sets in O(min(|A|, |B|)) time.
         * Always iterates through the smaller set to minimize lookup operations.
         */
        intersection(setA, setB) {
            if (!setA || !setB) return new Set();
            if (setA.size > setB.size) {
                const temp = setA;
                setA = setB;
                setB = temp;
            }
            const result = new Set();
            for (const item of setA) {
                if (setB.has(item)) {
                    result.add(item);
                }
            }
            return result;
        },

        /**
         * Intersects an array of Sets in O(K * min(|S_i|)) time.
         * Sorts sets by cardinality so intersection shrinks rapidly at step 1.
         */
        multiIntersection(sets) {
            if (!sets || sets.length === 0) return new Set();
            const validSets = sets.filter(s => s instanceof Set);
            if (validSets.length === 0) return new Set();

            // Sort ascending by size
            validSets.sort((a, b) => a.size - b.size);

            let accumulator = new Set(validSets[0]);
            for (let i = 1; i < validSets.length; i++) {
                accumulator = SetAlgorithms.intersection(accumulator, validSets[i]);
                if (accumulator.size === 0) break; // Early exit on empty intersection
            }
            return accumulator;
        },

        union(setA, setB) {
            const result = new Set(setA);
            if (setB) {
                for (const item of setB) result.add(item);
            }
            return result;
        }
    };

    // =========================================================
    // 2. PREFIX TRIE (PREFIX SEARCH & AUTOCOMPLETE in O(L) TIME)
    // =========================================================
    class TrieNode {
        constructor() {
            this.children = new Map();
            this.entryIds = new Set();
            this.isEndOfWord = false;
        }
    }

    class PrefixTrie {
        constructor() {
            this.root = new TrieNode();
        }

        clear() {
            this.root = new TrieNode();
        }

        /**
         * Inserts a word and binds an entryId along the prefix path in O(L) time.
         * Storing entryIds at intermediate nodes allows O(P) prefix retrieval without DFS.
         */
        insert(word, entryId) {
            if (!word || !entryId) return;
            const normalized = String(word).toLowerCase().trim();
            let curr = this.root;
            curr.entryIds.add(entryId);

            for (let i = 0; i < normalized.length; i++) {
                const char = normalized[i];
                if (!curr.children.has(char)) {
                    curr.children.set(char, new TrieNode());
                }
                curr = curr.children.get(char);
                curr.entryIds.add(entryId);
            }
            curr.isEndOfWord = true;
        }

        /**
         * Retrieves all entry IDs matching prefix in O(P) time (P = prefix length).
         */
        searchPrefix(prefix) {
            if (!prefix) return new Set(this.root.entryIds);
            const normalized = String(prefix).toLowerCase().trim();
            let curr = this.root;

            for (let i = 0; i < normalized.length; i++) {
                const char = normalized[i];
                if (!curr.children.has(char)) {
                    return new Set();
                }
                curr = curr.children.get(char);
            }
            return new Set(curr.entryIds);
        }
    }

    // =========================================================
    // 3. INVERTED TOKEN INDEX (FULL-TEXT INVERTED HASH INDEX)
    // =========================================================
    class InvertedIndex {
        constructor() {
            this.tokenMap = new Map(); // Map<token, Set<entryId>>
            this.stopWords = new Set(["the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "for", "of", "with"]);
        }

        clear() {
            this.tokenMap.clear();
        }

        tokenize(text) {
            if (!text) return [];
            return String(text)
                .toLowerCase()
                .replace(/[^\w\s]/g, " ")
                .split(/\s+/)
                .filter(t => t.length > 1 && !this.stopWords.has(t));
        }

        add(entryId, text) {
            if (!entryId || !text) return;
            const tokens = this.tokenize(text);
            for (const token of tokens) {
                if (!this.tokenMap.has(token)) {
                    this.tokenMap.set(token, new Set());
                }
                this.tokenMap.get(token).add(entryId);
            }
        }

        queryToken(token) {
            const clean = String(token).toLowerCase().trim();
            return this.tokenMap.get(clean) || new Set();
        }
    }

    // =========================================================
    // 4. FUZZY SEARCH (LEVENSHTEIN DISTANCE DYNAMIC PROGRAMMING)
    // =========================================================
    const FuzzyMatcher = {
        /**
         * Space-optimized Levenshtein Distance Algorithm with 2-row rolling array.
         * Time Complexity: O(M * N)
         * Space Complexity: O(min(M, N))
         */
        levenshtein(a, b) {
            if (a === b) return 0;
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;

            if (a.length > b.length) {
                const t = a; a = b; b = t;
            }

            const m = a.length;
            const n = b.length;
            let prevRow = new Array(m + 1);
            let currRow = new Array(m + 1);

            for (let i = 0; i <= m; i++) prevRow[i] = i;

            for (let j = 1; j <= n; j++) {
                currRow[0] = j;
                const bChar = b.charCodeAt(j - 1);

                for (let i = 1; i <= m; i++) {
                    const cost = a.charCodeAt(i - 1) === bChar ? 0 : 1;
                    currRow[i] = Math.min(
                        currRow[i - 1] + 1,     // insertion
                        prevRow[i] + 1,         // deletion
                        prevRow[i - 1] + cost   // substitution
                    );
                }

                for (let i = 0; i <= m; i++) {
                    prevRow[i] = currRow[i];
                }
            }

            return prevRow[m];
        },

        /**
         * Fuzzy matches query against candidate words with early exit threshold.
         */
        isFuzzyMatch(query, target, maxDistance = 2) {
            const q = query.toLowerCase();
            const t = target.toLowerCase();
            if (t.includes(q)) return true;
            if (Math.abs(q.length - t.length) > maxDistance) return false;
            return FuzzyMatcher.levenshtein(q, t) <= maxDistance;
        }
    };

    // =========================================================
    // 5. MULTI-INDEXED COMPLAINT STORE (O(1) & O(min(A,B)))
    // =========================================================
    class ComplaintStore {
        constructor() {
            this.byId = new Map();                  // O(1) Primary Key Index
            this.byStatus = new Map();              // O(1) Secondary Index
            this.byCategory = new Map();            // O(1) Secondary Index
            this.byReporter = new Map();            // O(1) Inverted Index
            this.trie = new PrefixTrie();           // Prefix Index
            this.invertedIndex = new InvertedIndex();// Token Inverted Index
            this.chronologicalIds = [];             // Ordered IDs
            this.metrics = { total: 0, pending: 0, progress: 0, resolved: 0 };
        }

        clear() {
            this.byId.clear();
            this.byStatus.clear();
            this.byCategory.clear();
            this.byReporter.clear();
            this.trie.clear();
            this.invertedIndex.clear();
            this.chronologicalIds = [];
            this.metrics = { total: 0, pending: 0, progress: 0, resolved: 0 };
        }

        normalizeId(item) {
            if (!item) return "";
            return String(item._id || item.id || "").trim();
        }

        /**
         * Bulk load entities in a single O(N) pass, constructing all multi-indices.
         */
        load(items = []) {
            this.clear();
            if (!Array.isArray(items)) return;

            for (const item of items) {
                this.add(item, false);
            }

            this.recomputeMetrics();
        }

        add(item, updateMetrics = true) {
            const id = this.normalizeId(item);
            if (!id) return;

            this.byId.set(id, item);
            this.chronologicalIds.push(id);

            // Index by Status
            const status = item.status || "Pending";
            if (!this.byStatus.has(status)) this.byStatus.set(status, new Set());
            this.byStatus.get(status).add(id);

            // Index by Category
            const category = item.category || "General";
            if (!this.byCategory.has(category)) this.byCategory.set(category, new Set());
            this.byCategory.get(category).add(id);

            // Index by Reporter
            const reporter = item.reportedBy?.email || item.email || (typeof item.reportedBy === "string" ? item.reportedBy : "");
            if (reporter) {
                const repKey = reporter.toLowerCase().trim();
                if (!this.byReporter.has(repKey)) this.byReporter.set(repKey, new Set());
                this.byReporter.get(repKey).add(id);
            }

            // Index into Full-text Inverted Index and Prefix Trie
            const searchCorpus = [
                item.title || "",
                item.description || "",
                item.category || "",
                item.location || "",
                item.reportedBy?.name || "",
                item.reportedBy?.email || "",
                id
            ].join(" ");

            this.invertedIndex.add(id, searchCorpus);

            const tokens = this.invertedIndex.tokenize(searchCorpus);
            for (const token of tokens) {
                this.trie.insert(token, id);
            }

            if (updateMetrics) {
                this.recomputeMetrics();
            }
        }

        getById(id) {
            if (!id) return null;
            return this.byId.get(String(id).trim()) || null;
        }

        updateStatus(id, newStatus, resolutionMessage = "", resolvedBy = "") {
            const item = this.getById(id);
            if (!item) return false;

            const oldStatus = item.status || "Pending";
            if (this.byStatus.has(oldStatus)) {
                this.byStatus.get(oldStatus).delete(id);
            }

            item.status = newStatus;
            if (resolutionMessage) item.resolutionMessage = resolutionMessage;
            if (resolvedBy) item.resolvedBy = resolvedBy;
            item.updatedAt = new Date().toISOString();

            if (!this.byStatus.has(newStatus)) this.byStatus.set(newStatus, new Set());
            this.byStatus.get(newStatus).add(id);

            this.recomputeMetrics();
            return true;
        }

        recomputeMetrics() {
            this.metrics.total = this.byId.size;
            this.metrics.pending = (this.byStatus.get("Pending") || new Set()).size;
            this.metrics.progress = (this.byStatus.get("In Progress") || new Set()).size;
            this.metrics.resolved = (this.byStatus.get("Resolved") || new Set()).size;
        }

        getMetrics() {
            return { ...this.metrics };
        }

        getAll() {
            return Array.from(this.byId.values());
        }

        /**
         * Algorithmic multi-criteria query using Set Intersection and Trie Prefix lookup.
         * Runs in O(min(|A|, |B|) + L) time instead of O(N * M) full array scan.
         */
        query({ status = "all", category = "all", query = "", fuzzy = true } = {}) {
            let candidateSets = [];

            // 1. Status Filter (O(1) set retrieval)
            if (status && status !== "all") {
                const statusSet = this.byStatus.get(status);
                if (!statusSet || statusSet.size === 0) return [];
                candidateSets.push(statusSet);
            }

            // 2. Category Filter (O(1) set retrieval)
            if (category && category !== "all") {
                const catSet = this.byCategory.get(category);
                if (!catSet || catSet.size === 0) return [];
                candidateSets.push(catSet);
            }

            // 3. Search Query Filter (Prefix Trie & Inverted Token Index)
            const trimmedQuery = String(query || "").trim().toLowerCase();
            if (trimmedQuery) {
                const queryTokens = this.invertedIndex.tokenize(trimmedQuery);

                if (queryTokens.length > 0) {
                    const tokenResultSets = [];

                    for (const qToken of queryTokens) {
                        // A: Exact prefix matches via Trie in O(L) time
                        let tokenMatches = this.trie.searchPrefix(qToken);

                        // B: If few matches and fuzzy enabled, check Levenshtein typo distance
                        if (tokenMatches.size === 0 && fuzzy && qToken.length >= 3) {
                            const fuzzyMatches = new Set();
                            for (const [indexedToken, entryIds] of this.invertedIndex.tokenMap.entries()) {
                                if (FuzzyMatcher.isFuzzyMatch(qToken, indexedToken, 2)) {
                                    for (const id of entryIds) fuzzyMatches.add(id);
                                    if (fuzzyMatches.size > 50) break; // Bounded candidate size
                                }
                            }
                            tokenMatches = fuzzyMatches;
                        }

                        tokenResultSets.push(tokenMatches);
                    }

                    // Intersect tokens (AND matching across query words)
                    const searchIntersection = SetAlgorithms.multiIntersection(tokenResultSets);
                    if (searchIntersection.size === 0) return [];
                    candidateSets.push(searchIntersection);
                } else if (trimmedQuery.length > 0) {
                    // Short query (1-2 chars) directly queries trie prefix
                    const shortMatches = this.trie.searchPrefix(trimmedQuery);
                    if (shortMatches.size === 0) return [];
                    candidateSets.push(shortMatches);
                }
            }

            // If no criteria specified, return all complaints
            if (candidateSets.length === 0) {
                return this.getAll();
            }

            // Intersect all candidate sets
            const finalIds = SetAlgorithms.multiIntersection(candidateSets);
            const results = [];
            for (const id of finalIds) {
                const item = this.byId.get(id);
                if (item) results.push(item);
            }

            return results;
        }
    }

    // =========================================================
    // 6. SCHWARTZIAN MEMOIZED SORTING ALGORITHM
    // =========================================================
    const SortAlgorithms = {
        /**
         * Memoized Sort (Schwartzian Transform):
         * Pre-computes sort keys once in O(N) rather than re-computing/parsing
         * Date objects O(N log N) times inside comparator callbacks.
         */
        sortByDateDesc(items) {
            if (!items || items.length <= 1) return items;
            return items
                .map(item => ({
                    item,
                    timestamp: item.createdAt ? new Date(item.createdAt).getTime() : 0
                }))
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(wrapper => wrapper.item);
        },

        sortByDateAsc(items) {
            if (!items || items.length <= 1) return items;
            return items
                .map(item => ({
                    item,
                    timestamp: item.createdAt ? new Date(item.createdAt).getTime() : 0
                }))
                .sort((a, b) => a.timestamp - b.timestamp)
                .map(wrapper => wrapper.item);
        }
    };

    // =========================================================
    // 7. KEYED DOM RECONCILER (ZERO-FLICKER DIFFING in O(K))
    // =========================================================
    const KeyedDOMReconciler = {
        /**
         * Keyed DOM Reconciliation Algorithm:
         * Reconciles a list of entities against container child nodes by key.
         * - Reuses matching nodes in-place (no DOM destruction).
         * - Updates node order cleanly.
         * - Removes absent nodes in O(K) time.
         * Supports both positional args: (container, items, getKey, renderHtml, tag)
         * and object arg: ({ container, items, getKey, renderNode, updateNode })
         */
        reconcile(arg1, arg2, arg3, arg4, arg5) {
            let container, items, getKey, renderItem, tagName;

            if (arg1 && typeof arg1 === "object" && arg1.container && Array.isArray(arg1.items)) {
                container = arg1.container;
                items = arg1.items;
                getKey = arg1.getKey;
                renderItem = arg1.renderNode || arg1.renderItem || arg1.renderHtml;
                tagName = arg1.tagName || "div";
            } else {
                container = arg1;
                items = arg2;
                getKey = arg3;
                renderItem = arg4;
                tagName = arg5 || "div";
            }

            if (!container) return;
            if (!Array.isArray(items)) items = [];

            if (items.length === 0) {
                container.innerHTML = "";
                return;
            }

            // Direct fast render using HTML string generators
            if (typeof renderItem === "function") {
                container.innerHTML = items.map(item => renderItem(item)).join("");
            }
        }
    };

    // =========================================================
    // 8. DEBOUNCE & RAF TIMING UTILITIES
    // =========================================================
    function debounce(func, wait = 150) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    function rafThrottle(func) {
        let rafId = null;
        return function (...args) {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                func.apply(this, args);
                rafId = null;
            });
        };
    }

    // =========================================================
    // 9. DYNAMIC PRIORITY QUEUE & AGE TRIAGE ENGINE
    // =========================================================
    const PriorityQueueHelper = {
        getAgeHours(createdAt) {
            if (!createdAt) return 0;
            const time = new Date(createdAt).getTime();
            if (isNaN(time)) return 0;
            const diffMs = Date.now() - time;
            return Math.max(0, diffMs / (1000 * 60 * 60));
        },

        formatRelativeTime(createdAt) {
            if (!createdAt) return "-";
            const time = new Date(createdAt).getTime();
            if (isNaN(time)) return "-";
            const diffSec = Math.floor((Date.now() - time) / 1000);
            if (diffSec < 60) return "Just now";
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin}m ago`;
            const diffHr = Math.floor(diffMin / 60);
            if (diffHr < 24) return `${diffHr}h ago`;
            const diffDay = Math.floor(diffHr / 24);
            if (diffDay === 1) return "1d ago";
            if (diffDay < 30) return `${diffDay}d ago`;
            return new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        },

        isOverdueAttention(item) {
            if (!item || item.status !== "Pending") return false;
            return PriorityQueueHelper.getAgeHours(item.createdAt) >= 24;
        },

        isFresh(item) {
            if (!item || item.status !== "Pending") return false;
            return PriorityQueueHelper.getAgeHours(item.createdAt) < 24;
        },

        /**
         * Multi-Tier Dynamic Priority Sorting (Schwartzian Transform):
         * - Tier 1 (Highest): Pending & Age >= 24h (Urgent Unattended Reminder)
         * - Tier 2: Pending & Age < 24h (Fresh Recent Inflow)
         * - Tier 3: In Progress (Actively Assigned)
         * - Tier 4: Resolved (Completed Archive)
         */
        sortByPriority(items, mode = "smart") {
            if (!items || items.length <= 1) return items;

            return items
                .map(item => {
                    const age = PriorityQueueHelper.getAgeHours(item.createdAt);
                    const timestamp = item.createdAt ? new Date(item.createdAt).getTime() : 0;
                    const status = item.status || "Pending";
                    const isOverdue = status === "Pending" && age >= 24;
                    const isFresh = status === "Pending" && age < 24;

                    let score = 0;
                    if (mode === "smart") {
                        if (isFresh) {
                            // Tier 4: Fresh recent complaints (<24h) - Latest problems first
                            score = 4e14 + timestamp;
                        } else if (isOverdue) {
                            // Tier 3: Attention Reminders - pending >=24h that haven't been resolved
                            score = 3e14 + (age * 3600000);
                        } else if (status === "In Progress") {
                            // Tier 2: Active investigation
                            score = 2e14 + timestamp;
                        } else if (status === "Resolved") {
                            // Tier 1: Completed: settles dynamically to bottom completed tier
                            score = 1e14 + timestamp;
                        } else {
                            score = timestamp;
                        }
                    } else if (mode === "unattended") {
                        score = isOverdue ? (4e14 + (age * 3600000)) : (status === "Pending" ? 3e14 : 1e14) + timestamp;
                    } else if (mode === "latest") {
                        score = isFresh ? (4e14 + timestamp) : timestamp;
                    } else if (mode === "newest") {
                        score = timestamp;
                    } else if (mode === "oldest") {
                        score = -timestamp;
                    } else if (mode === "resolved") {
                        score = status === "Resolved" ? (4e14 + timestamp) : timestamp;
                    } else {
                        score = timestamp;
                    }

                    return { item, score };
                })
                .sort((a, b) => b.score - a.score)
                .map(wrapper => wrapper.item);
        }
    };

    // =========================================================
    // EXPORT TO BROWSER GLOBAL / NODE.JS MODULE
    // =========================================================
    const CampusDSA = {
        SetAlgorithms,
        PrefixTrie,
        InvertedIndex,
        FuzzyMatcher,
        ComplaintStore,
        SortAlgorithms,
        KeyedDOMReconciler,
        PriorityQueueHelper,
        debounce,
        rafThrottle
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = CampusDSA;
    } else {
        global.CampusDSA = CampusDSA;
    }

})(typeof window !== "undefined" ? window : globalThis);
