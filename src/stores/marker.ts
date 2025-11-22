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
 * - **WordSelectionRectangle.vue**: Renders visual borders around marked words and selection anchors using the store's state and helper actions.
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
      // Sort words by ID order (line, then wordIndex) to ensure correct reading order
      const sortedWords = [...state.markedWords].sort((a, b) => {
        // Parse IDs to get line and wordIndex (reading order)
        const aParts = a.id.split("-").map(Number);
        const bParts = b.id.split("-").map(Number);

        if (aParts.length >= 2 && bParts.length >= 2) {
          const aLine = aParts[0];
          const bLine = bParts[0];
          const aWordIndex = aParts[1];
          const bWordIndex = bParts[1];

          // First sort by line (reading order across lines)
          if (aLine !== bLine) {
            return aLine - bLine;
          }

          // Then sort by wordIndex within the same line
          return aWordIndex - bWordIndex;
        }

        // Fallback to string comparison if ID format is invalid
        return a.id.localeCompare(b.id);
      });

      return sortedWords.map((item) => item.word).join(" ");
    },

    /**
     * Returns the bounding rectangle of all marked words.
     * Returns null if no words are marked.
     */
    rectangleBounds: (state) => {
      if (state.markedWords.length === 0) return null;

      // Get current DOM positions
      const rects = state.markedWords
        .map((word) => {
          const el = document.getElementById(word.id);
          return el ? el.getBoundingClientRect() : word.domeRect;
        })
        .filter((r): r is DOMRect => r !== null);

      if (rects.length === 0) return null;

      // Calculate bounding box
      let minLeft = rects[0].left;
      let maxRight = rects[0].right;
      let minTop = rects[0].top;
      let maxBottom = rects[0].bottom;

      rects.forEach((rect) => {
        if (rect.left < minLeft) minLeft = rect.left;
        if (rect.right > maxRight) maxRight = rect.right;
        if (rect.top < minTop) minTop = rect.top;
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      });

      return {
        left: minLeft,
        right: maxRight,
        top: minTop,
        bottom: maxBottom,
        width: maxRight - minLeft,
        height: maxBottom - minTop,
      };
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
     * Gets the ID of the adjacent word in the specified direction based on ID order (reading order across lines).
     * @param direction 'left' for previous word, 'right' for next word
     * @returns The adjacent word ID, or null if not found
     */
    getAdjacentWordId(direction: "left" | "right"): string | null {
      if (this.markedWords.length === 0) return null;

      // Get all word elements with IDs
      const allWordElements = Array.from(
        document.querySelectorAll("span[id]")
      ) as HTMLElement[];

      // Parse all words and sort by ID order (line, then wordIndex)
      const allWords = allWordElements
        .map((el) => {
          const id = el.id;
          if (!id) return null;
          const parts = id.split("-").map(Number);
          if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const line = parts[0];
            const wordIndex = parts[1];
            const sequentialId = parts[2];
            return { id, element: el, line, wordIndex, sequentialId };
          }
          return null;
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);

      if (allWords.length === 0) return null;

      // Sort words by reading order: first by line, then by wordIndex
      allWords.sort((a, b) => {
        if (a.line !== b.line) {
          return a.line - b.line;
        }
        return a.wordIndex - b.wordIndex;
      });

      // Find edge marked word based on direction in sorted order
      const markedIds = new Set(this.markedWords.map((w) => w.id));

      let edgeIndex = -1;
      if (direction === "left") {
        // Find the leftmost (first in reading order) marked word
        edgeIndex = allWords.findIndex((w) => markedIds.has(w.id));
      } else {
        // Find the rightmost (last in reading order) marked word
        for (let i = allWords.length - 1; i >= 0; i--) {
          if (markedIds.has(allWords[i].id)) {
            edgeIndex = i;
            break;
          }
        }
      }

      if (edgeIndex === -1) return null;

      // Find adjacent word in sorted order
      if (direction === "left") {
        // Look for previous unmarked word
        for (let i = edgeIndex - 1; i >= 0; i--) {
          if (!markedIds.has(allWords[i].id)) {
            return allWords[i].id;
          }
        }
      } else {
        // Look for next unmarked word
        for (let i = edgeIndex + 1; i < allWords.length; i++) {
          if (!markedIds.has(allWords[i].id)) {
            return allWords[i].id;
          }
        }
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
