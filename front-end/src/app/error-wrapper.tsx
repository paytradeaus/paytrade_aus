"use client";

import { useState, useEffect } from "react";

export const BrokenModule = (props: any) => {
  const [isBroken, setIsBroken] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsBroken(true);
    }, 1000);
  }, []);

  if (isBroken) {
    const test = props.test.not;
    throw new Error("Error");
  }

  return <p>Broken module</p>;
};
