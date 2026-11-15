import { FileDocument } from "@modular-rest/client/dist/types/types";

export interface PhraseType {
  _id: string;
  refId: string;
  phrase: string;
  translation: string;
  translation_language: string;
  images?: [FileDocument];
  /** Round 1 (B-08): the learning language; missing means English. */
  language?: string;
  languageSource?: string;
  /** "pending" for a phrase kept for a language not added yet (B-32). */
  status?: string;
}

export interface PhraseBundleType {
  _id: string;
  refId: string;
  title: string;
  image: [FileDocument];
  phrases: [string];
  /** Round 1 (B-09): the learning language; missing means English. */
  language?: string;
}

export interface PopulatedPhraseBundleType {
  _id: string;
  refId: string;
  title: string;
  image: [FileDocument];
  phrases: [PhraseType];
}
