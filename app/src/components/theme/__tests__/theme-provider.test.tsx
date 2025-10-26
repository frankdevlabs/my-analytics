import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../theme-provider";
import { useTheme } from "next-themes";

// Mock next-themes
jest.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: jest.fn(),
}));

describe("ThemeProvider", () => {
  it("should render children within theme context", () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should wrap children with next-themes provider", () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    // Verify the children are rendered
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});

describe("Theme Context Integration", () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      setTheme: jest.fn(),
      systemTheme: "light",
    });
  });

  it("should provide theme context to consuming components", () => {
    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>Current theme: {theme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText("Current theme: light")).toBeInTheDocument();
  });

  it("should update theme when setTheme is called", async () => {
    const mockSetTheme = jest.fn();
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      setTheme: mockSetTheme,
      systemTheme: "light",
    });

    const TestComponent = () => {
      const { setTheme } = useTheme();
      return (
        <button onClick={() => setTheme("dark")}>
          Toggle Theme
        </button>
      );
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const button = screen.getByText("Toggle Theme");
    button.click();

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  it("should respect system preference when theme is set to system", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "system",
      setTheme: jest.fn(),
      systemTheme: "dark",
    });

    const TestComponent = () => {
      const { theme, systemTheme } = useTheme();
      return (
        <div>
          Theme: {theme}, System: {systemTheme}
        </div>
      );
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText("Theme: system, System: dark")).toBeInTheDocument();
  });
});
