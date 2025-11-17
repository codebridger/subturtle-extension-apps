/**
 * Pinia Store: useMarkerStore ("marker")
 *
 * This store manages the logic for marking, selecting, and translating words or phrases within subtitle components.
 *
 * ## Responsibilities
 * - Tracks marking mode (mark/select) and whether the user is actively marking words.
 * - Maintains a list of marked words, including their DOM positions for UI highlighting and border rendering.
 * - Stores the source language and context for translation purposes.
 * - Handles translation of selected phrases and caches results.
 *
 * ## Usage
 * - **Word.vue**: Handles mouse events to mark single or multiple words, clear selections, and open word detail modals using marked words and context.
 * - **MarkerBorder.vue**: Renders visual borders around contiguous marked words using the store's state and helper actions.
 * - **TranslatedPhrase.vue**: Displays translations for the currently selected phrase and provides contextual UI actions.
 * - **web_youtube/Index.vue**: Integrates the store at the page level, updating context with the current subtitle text and ensuring the store is available for all subtitle-related components.
 * - **helpers/global-events.ts**: Registers global keyboard events to trigger marking mode via the store's exported functions.
 *
 * ## How It Works
 * - User interactions (mouse/keyboard) trigger marking, selection, and translation logic.
 * - Marked words are visually highlighted and grouped for UI feedback.
 * - Marked phrases are automatically translated and displayed in the UI.
 * - Contextual actions (e.g., word detail modals) use the marked phrase and context from the store.
 *
 * This store is central to the interactive subtitle marking and translation experience in the extension.
 */
import { defineStore } from "pinia";
import { TranslateService } from "../common/services/translate.service";

/**
 * Represents a word that has been marked by the user, including its unique id, text, and DOM rectangle for UI positioning.
 */
export interface MarkedWord {
  id: string; // Unique identifier for the word (format: [line]-[wordIndex]-[line*wordIndex])
  word: string; // The actual word text
  domeRect: DOMRect; // The DOM rectangle for UI highlighting
}

/**
 * State shape for the marker store.
 */
interface State {
  /**
   * Current mode of the marker: 'mark' for marking words, 'select' for selection mode.
   */
  mode: "mark" | "select";
  /**
   * Whether the user is actively marking words (mouse held down).
   */
  marking: boolean;
  /**
   * List of currently marked words with their DOM positions.
   */
  markedWords: MarkedWord[];
  /**
   * Source language for translation (auto-detected or set).
   */
  sourceLanguage: string;
  /**
   * Cached translations for marked phrases (keyed by phrase).
   */
  translatedWords: Record<string, string>;
  /**
   * Context string (e.g., full subtitle text) for translation accuracy.
   */
  context: string;
  /**
   * ID of the currently hovered word (for showing selection rectangle).
   */
  hoveredWordId: string | null;
  /**
   * Whether anchor dragging is currently active (prevents rectangle recalculation).
   */
  isAnchorDragging: boolean;
}

/**
 * Pinia store for managing word marking, selection, and translation in subtitles.
 */
export const useMarkerStore = defineStore("marker", {
  state: (): State => ({
    /**
     * Current mode: 'mark' for marking, 'select' for selection.
     */
    mode: "select",
    /**
     * Whether marking is currently active (mouse held down).
     */
    marking: false,
    /**
     * Array of marked words with their DOM positions.
     */
    markedWords: [],
    /**
     * Source language for translation (auto-detected).
     */
    sourceLanguage: "",
    /**
     * Cached translations for marked phrases.
     */
    translatedWords: {},
    /**
     * Context string for translation.
     */
    context: "",
    /**
     * ID of the currently hovered word.
     */
    hoveredWordId: null,
    /**
     * Whether anchor dragging is active.
     */
    isAnchorDragging: false,
  }),

  getters: {
    /**
     * Returns true if the store is in marking mode (as opposed to selection mode).
     */
    isMarkingMode: (state) => state.mode === "mark",
    /**
     * Returns true if the user is actively marking (mouse held down).
     */
    isMarking: (state) => state.marking,
    /**
     * Returns the array of currently marked words.
     */
    words: (state) => state.markedWords,
    /**
     * Returns the currently selected phrase (all marked words joined by space).
     * Words are sorted by their DOM position (left to right, top to bottom) to ensure correct order.
     */
    selectedPhrase: (state) => {
      // Sort words by their DOM position to ensure correct order
      const sortedWords = [...state.markedWords].sort((a, b) => {
        // Get current DOM positions
        const aEl = document.getElementById(a.id);
        const bEl = document.getElementById(b.id);

        if (!aEl || !bEl) {
          // Fallback to sequential ID if elements not found
          const aSeqId = a.id.split("-").map(Number)[2];
          const bSeqId = b.id.split("-").map(Number)[2];
          return aSeqId - bSeqId;
        }

        const aRect = aEl.getBoundingClientRect();
        const bRect = bEl.getBoundingClientRect();

        // First sort by top position (line)
        const topDiff = aRect.top - bRect.top;
        if (Math.abs(topDiff) > aRect.height * 0.5) {
          return topDiff;
        }

        // Then sort by left position (word order within line)
        return aRect.left - bRect.left;
      });

      return sortedWords.map((item) => item.word).join(" ");
    },
  },

  actions: {
    /**
     * Translates the currently selected phrase using the context, and stores the result in translatedWords.
     */
    translate() {
      let translatingList = [this.selectedPhrase];

      const _this = this;

      TranslateService.instance
        .fetchSimpleTranslation(translatingList, this.context)
        .then((res: string) => {
          _this.sourceLanguage = "auto";

          translatingList.forEach((result, i) => {
            _this.translatedWords[result] = res;
          });
        });
    },

    /**
     * Toggles between marking and selection mode. Triggers translation when switching to selection mode.
     * @param value True to enter marking mode, false to enter selection mode.
     */
    toggleMarkingMode(value: boolean) {
      this.mode = value ? "mark" : "select";

      if (value == false) {
        this.translate();
      }
    },

    /**
     * Sets whether the user is actively marking (mouse held down). Adds a one-time mouseup listener to stop marking.
     * @param value True to start marking, false to stop.
     */
    toggleMarking(value: boolean) {
      this.marking = value;

      if (value == true) {
        const _this = this;
        document.addEventListener(
          "mouseup",
          () => {
            _this.toggleMarking(false);
          },
          { once: true }
        );
      }
    },

    /**
     * Adds a word to the markedWords array if not already present, sorts them, and triggers translation if not marking.
     * @param id Unique word id
     * @param word The word text
     * @param domeRect The DOMRect for UI positioning
     */
    markWord(id: string, word: string, domeRect: DOMRect) {
      const isExist = this.markedWords.find((item) => item.id === id);
      if (isExist) return;

      this.markedWords.push({ id, word, domeRect });
      // Sort base id
      this.markedWords = this.markedWords.sort((a, b) => {
        // id format is [line]-[wordIndex]-[line * wordIndex]
        // So, we can split the id by "-" and get the last element
        const aid = a.id.split("-").map(Number)[2];
        const bid = b.id.split("-").map(Number)[2];

        return aid - bid;
      });

      // Translate the selected phrase
      if (!this.marking) {
        this.translate();
      } else {
        // when marking changed the translate will be triggered
      }
    },

    /**
     * Clears all marked words.
     */
    clear() {
      this.markedWords = [];
    },

    /**
     * Checks if a word with the given id is currently selected (marked).
     * @param id The word id to check
     * @returns True if the word is marked, false otherwise
     */
    checkedSelected(id: string) {
      return !!this.markedWords.find((item) => item.id === id);
    },

    /**
     * Generates a unique word id based on line and word index.
     * @param line The line number
     * @param wordIndex The word index in the line
     * @returns The generated id string
     */
    getWordId(line: number, wordIndex: number) {
      return line + "-" + wordIndex + "-" + line * wordIndex;
    },

    /**
     * Extracts the sequential id (line * wordIndex) from a word id string.
     * @param id The word id string
     * @returns The sequential id as a number
     */
    getSequentialId(id: string) {
      return id.split("-").map(Number)[2];
    },

    /**
     * Sets the context string for translation (e.g., the full subtitle text).
     * @param context The context string
     */
    setContext(context: string) {
      this.context = context;
    },

    /**
     * Sets the currently hovered word ID (for showing selection rectangle).
     * @param id The word ID, or null to clear
     */
    setHoveredWordId(id: string | null) {
      this.hoveredWordId = id;
    },

    /**
     * Gets the ID of the adjacent word in the specified direction based on DOM position.
     * @param direction 'left' for previous word, 'right' for next word
     * @returns The adjacent word ID, or null if not found
     */
    getAdjacentWordId(direction: "left" | "right"): string | null {
      if (this.markedWords.length === 0) return null;

      // Get all word elements and their positions
      const allWordElements = Array.from(
        document.querySelectorAll("span[id]")
      ) as HTMLElement[];

      // Filter to valid word elements with IDs
      const validWords = allWordElements
        .map((el) => {
          const id = el.id;
          if (!id) return null;
          const parts = id.split("-").map(Number);
          if (parts.length >= 3 && !isNaN(parts[2])) {
            const rect = el.getBoundingClientRect();
            return { id, element: el, rect, sequentialId: parts[2] };
          }
          return null;
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);

      if (validWords.length === 0) return null;

      // Find the edge word based on direction
      let edgeWord: (typeof validWords)[0] | null = null;
      if (direction === "left") {
        // Find leftmost marked word
        const markedRects = this.markedWords
          .map((w) => {
            const el = document.getElementById(w.id);
            return el ? el.getBoundingClientRect() : null;
          })
          .filter((r): r is DOMRect => r !== null);

        if (markedRects.length === 0) return null;

        const minLeft = Math.min(...markedRects.map((r) => r.left));
        edgeWord =
          validWords.find((w) => {
            const marked = this.markedWords.find((mw) => mw.id === w.id);
            return marked && Math.abs(w.rect.left - minLeft) < 1;
          }) || null;
      } else {
        // Find rightmost marked word
        const markedRects = this.markedWords
          .map((w) => {
            const el = document.getElementById(w.id);
            return el ? el.getBoundingClientRect() : null;
          })
          .filter((r): r is DOMRect => r !== null);

        if (markedRects.length === 0) return null;

        const maxRight = Math.max(...markedRects.map((r) => r.right));
        edgeWord =
          validWords.find((w) => {
            const marked = this.markedWords.find((mw) => mw.id === w.id);
            return marked && Math.abs(w.rect.right - maxRight) < 1;
          }) || null;
      }

      if (!edgeWord) return null;

      // Find adjacent word based on visual position
      const edgeRect = edgeWord.rect;
      const edgeCenterY = edgeRect.top + edgeRect.height / 2;

      let adjacentWord: (typeof validWords)[0] | null = null;
      let minDistance = Infinity;

      for (const word of validWords) {
        // Skip if already marked
        if (this.checkedSelected(word.id)) continue;

        const wordRect = word.rect;
        const wordCenterY = wordRect.top + wordRect.height / 2;

        // Check if word is on roughly the same line (within height tolerance)
        const verticalOverlap =
          Math.abs(wordCenterY - edgeCenterY) < edgeRect.height * 0.8;

        if (!verticalOverlap) continue;

        if (direction === "left") {
          // Word should be to the left of edge word
          if (wordRect.right <= edgeRect.left) {
            const distance = edgeRect.left - wordRect.right;
            if (distance < minDistance) {
              minDistance = distance;
              adjacentWord = word;
            }
          }
        } else {
          // Word should be to the right of edge word
          if (wordRect.left >= edgeRect.right) {
            const distance = wordRect.left - edgeRect.right;
            if (distance < minDistance) {
              minDistance = distance;
              adjacentWord = word;
            }
          }
        }
      }

      // Only return if word is reasonably close (within 50px horizontally)
      if (adjacentWord && minDistance < 50) {
        return adjacentWord.id;
      }

      return null;
    },

    /**
     * Marks a word by its ID. Finds the word element and calls markWord.
     * @param id The word ID to mark
     */
    markWordById(id: string) {
      const wordElement = document.getElementById(id);
      if (!wordElement) return;

      const boundingRect = wordElement.getBoundingClientRect();
      const wordText = wordElement.textContent?.trim() || "";

      if (wordText) {
        this.markWord(id, wordText, boundingRect);
      }
    },

    /**
     * Sets the anchor dragging state.
     * @param dragging True if dragging, false otherwise
     */
    setAnchorDragging(dragging: boolean) {
      this.isAnchorDragging = dragging;
    },
  },
});

/**
 * Global event handler to start marking mode when Control or Meta key is pressed.
 * Changes the cursor to text and registers listeners to stop marking.
 * @param e KeyboardEvent
 */
export const startMarking = (e: KeyboardEvent) => {
  if (e.key !== "Control" && e.key !== "Meta") return;

  useMarkerStore().toggleMarkingMode(true);
  document.body.style.cursor = "text";

  document.addEventListener("keyup", stopMarking);
  document.addEventListener("mouseup", stopMarking);
};

/**
 * Global event handler to stop marking mode when Control/Meta is released or mouse is released.
 * Resets the cursor and removes event listeners.
 * @param e KeyboardEvent | MouseEvent
 */
export const stopMarking = (e: KeyboardEvent | MouseEvent) => {
  const isControlOrMeta =
    e instanceof KeyboardEvent && (e.key === "Control" || e.key === "Meta");

  const isMouseUp = e instanceof MouseEvent && e.type === "mouseup";

  if (isControlOrMeta || isMouseUp) {
    // only stop marking when the key is Control or Meta or mouseup

    const isMarking = useMarkerStore().isMarking;
    if (isMarking) {
      useMarkerStore().toggleMarkingMode(false);
    }

    document.body.style.cursor = "default";
    document.removeEventListener("keyup", stopMarking);
    document.removeEventListener("mouseup", stopMarking);
  }
};
