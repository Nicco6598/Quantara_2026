export const accountingImplementationNotes = {
  caching:
    "Tariff resolution builds a Map keyed by tariff book and official code per resolution batch.",
  spaceComplexity: "O(n) additional space for n tariff voices in the active resolution set.",
  timeComplexity: "O(n + p log p), where n is tariff voices and p is contract priority rows.",
};
