import { setCurrentTheme } from "@/redux/slices/theme";

import { applicationStorage } from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

export default function UseThemeSwitcher() {
  const [theme, setTheme] = useState("light");
  const dispatch = useDispatch();

  // Check user preference from localStorage or system preferences
  useEffect(() => {
    const savedTheme =
      localStorage.getItem(applicationStorage.THEME) ?? "light";

    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    dispatch(setCurrentTheme(savedTheme));
  }, []);

  // Toggle theme and persist preference in localStorage
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(applicationStorage.THEME, newTheme);
    dispatch(setCurrentTheme(newTheme));
  };

  return { theme, toggleTheme };
}
