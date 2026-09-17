"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Deadline passed";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h until deadline`;
  if (hours > 0) return `${hours}h ${minutes}m until deadline`;
  return `${minutes}m until deadline`;
}

export default function Countdown({ target }: { target: string }) {
  const [label, setLabel] = useState(() => formatRemaining(new Date(target).getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setLabel(formatRemaining(new Date(target).getTime() - Date.now()));
    }, 30_000);
    return () => clearInterval(id);
  }, [target]);

  return <p className="text-sm font-medium text-pitch-dark dark:text-pitch">{label}</p>;
}
