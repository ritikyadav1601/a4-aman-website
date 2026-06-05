"use client";

import { useEffect, useState } from "react";

export default function Clock() {
  const [value, setValue] = useState("");

  useEffect(() => {
    function update() {
      const date = new Date();
      let hours = date.getHours();
      hours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      setValue(
        `${days[date.getDay()]} ${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()} ${String(hours).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
      );
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return <h2 className="clock-display text-xl sm:text-2xl font-semibold mb-4 uppercase text-center">{value}</h2>;
}
