import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import FormButton from "./button";

describe("CustomButton", () => {
  it("renders without crashing", () => {
    render(<FormButton />);
    const buttonElement = screen.getByRole("button");
    expect(buttonElement).toBeInTheDocument();
  });

  it('has type of "submit"', () => {
    render(<FormButton type="submit" />);
    const buttonElement = screen.getByRole("button");
    expect(buttonElement).toHaveAttribute("type", "submit");
  });
});
