import { useCallback, useState } from "react";
import { loadShowBookmarks, saveShowBookmarks } from "../lib/showBookmarks";

export function useShowBookmarks(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(loadShowBookmarks);
  const set = useCallback((next: boolean) => {
    setOn(next);
    saveShowBookmarks(next);
  }, []);
  return [on, set];
}
