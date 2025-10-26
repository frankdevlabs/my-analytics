import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../theme-toggle";
import { useTheme } from "next-themes";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

describe("ThemeToggle Component", () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
    });
  });

  it("should cycle from light to dark theme", async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />);

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText("Light")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("should cycle from dark to system theme", async () => {
    const user = userEvent.setup();
    (useTheme as jest.Mock).mockReturnValue({
      theme: "dark",
      setTheme: mockSetTheme,
      systemTheme: "light",
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByText("Dark")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("should cycle from system to light theme", async () => {
    const user = userEvent.setup();
    (useTheme as jest.Mock).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      systemTheme: "dark",
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByText("Auto (Dark)")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("should be keyboard accessible", async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByText("Light")).toBeInTheDocument();
    });

    const button = screen.getByRole("button");

    // Tab to focus the button
    await user.tab();
    expect(button).toHaveFocus();

    // Press Enter to activate
    await user.keyboard("{Enter}");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("should have descriptive ARIA label", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", expect.stringContaining("Current theme: Light"));
    });
  });

  it("should display system theme correctly", async () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "system",
      setTheme: mockSetTheme,
      systemTheme: "light",
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByText("Auto (Light)")).toBeInTheDocument();
    });
  });

  it("should have smooth transition styles", async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toHaveClass("transition-colors", "duration-300");
    });
  });
});
