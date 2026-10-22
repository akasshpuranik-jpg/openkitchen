// The 4 set spots every kitchen photographs, with the checklist Claude checks each against.
// Used by the seed script and the photo-check tuning script; the DB copy is what the app reads.
export const SPOTS = [
  {
    key: "prep_counter",
    label: "Prep counter",
    checklist: "Surface wiped and dry; no food scraps or spills; raw and cooked food kept apart; cutting boards clean; no pests.",
  },
  {
    key: "stove",
    label: "Stove",
    checklist: "No grease buildup on burners, hood or wall; no burnt residue; area around the stove clear; no pests.",
  },
  {
    key: "fridge",
    label: "Fridge",
    checklist: "All containers covered; no spills or pooled liquid; no visible spoilage or mould; raw meat stored below cooked food.",
  },
  {
    key: "wash_area",
    label: "Wash area",
    checklist: "Sink free of piled dirty dishes; soap present; drain clear; no standing water on the floor; no pests.",
  },
] as const;
