"use client";

import { useEffect, useState } from "react";
import {
  loadHistory,
  subscribeHistory,
  type HistoryRecord,
} from "@/lib/history";

export function useHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRecords(loadHistory());
    setHydrated(true);
    return subscribeHistory(() => setRecords(loadHistory()));
  }, []);

  return { records, hydrated };
}
