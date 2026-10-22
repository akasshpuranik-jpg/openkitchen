// Plain data the server prepares for the diner page's client components.

export type CardVM = {
  spotId: string;
  label: string;
  photo: {
    id: string;
    url: string;
    postedTime: string;
    chip: { label: string; className: string };
    lines: string[]; // the note, one line per issue
  } | null;
};

export type HistoryVM = {
  days: { date: string; weekday: string; dayNum: string; isToday: boolean }[]; // oldest → today
  rows: {
    key: string;
    label: string;
    cells: { label: string; className: string }[]; // aligned with `days`
  }[];
  legend: { label: string; className: string }[];
};
