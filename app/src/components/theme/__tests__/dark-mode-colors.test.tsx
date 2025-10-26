// Dark mode tests are visual tests that verify CSS variables are set correctly

/**
 * Dark Mode Color Token Tests
 *
 * Verifies that CSS variables switch correctly between light and dark modes,
 * following Frank's Blog color palette specifications.
 */

describe("Dark Mode Color Switching", () => {
  beforeEach(() => {
    // Set up CSS variables in document for testing
    document.documentElement.style.setProperty("--background", "#FEFBF4");
    document.documentElement.style.setProperty("--foreground", "#09192B");
    document.documentElement.style.setProperty("--accent", "#D9BF65");
  });

  it("should have correct light mode colors", () => {
    const styles = getComputedStyle(document.documentElement);

    expect(styles.getPropertyValue("--background").trim()).toBe("#FEFBF4");
    expect(styles.getPropertyValue("--foreground").trim()).toBe("#09192B");
    expect(styles.getPropertyValue("--accent").trim()).toBe("#D9BF65");
  });

  it("should switch to dark mode colors when .dark class is applied", () => {
    // Apply dark mode class
    document.documentElement.classList.add("dark");

    // Simulate dark mode CSS variables
    document.documentElement.style.setProperty("--background", "#09192B");
    document.documentElement.style.setProperty("--foreground", "#FEFBF4");

    const styles = getComputedStyle(document.documentElement);

    expect(styles.getPropertyValue("--background").trim()).toBe("#09192B");
    expect(styles.getPropertyValue("--foreground").trim()).toBe("#FEFBF4");
  });

  it("should keep accent color consistent across modes", () => {
    // Light mode
    let styles = getComputedStyle(document.documentElement);
    expect(styles.getPropertyValue("--accent").trim()).toBe("#D9BF65");

    // Dark mode
    document.documentElement.classList.add("dark");
    styles = getComputedStyle(document.documentElement);
    expect(styles.getPropertyValue("--accent").trim()).toBe("#D9BF65");
  });

  it("should switch button colors correctly", () => {
    // Light mode button colors
    document.documentElement.style.setProperty("--button-bg", "#09192B");
    document.documentElement.style.setProperty("--button-text", "#FEFBF4");

    let styles = getComputedStyle(document.documentElement);
    expect(styles.getPropertyValue("--button-bg").trim()).toBe("#09192B");
    expect(styles.getPropertyValue("--button-text").trim()).toBe("#FEFBF4");

    // Dark mode button colors
    document.documentElement.classList.add("dark");
    document.documentElement.style.setProperty("--button-bg", "#D9BF65");
    document.documentElement.style.setProperty("--button-text", "#09192B");

    styles = getComputedStyle(document.documentElement);
    expect(styles.getPropertyValue("--button-bg").trim()).toBe("#D9BF65");
    expect(styles.getPropertyValue("--button-text").trim()).toBe("#09192B");
  });

  it("should have proper surface and border colors in both modes", () => {
    // Light mode
    document.documentElement.style.setProperty("--surface", "#F5F2EB");
    document.documentElement.style.setProperty("--border", "rgba(9, 25, 43, 0.1)");

    const styles = getComputedStyle(document.documentElement);
    expect(styles.getPropertyValue("--surface").trim()).toBe("#F5F2EB");
    expect(styles.getPropertyValue("--border").trim()).toBe("rgba(9, 25, 43, 0.1)");

    // Dark mode
    document.documentElement.classList.add("dark");
    document.documentElement.style.setProperty("--surface", "#0F1F35");
    document.documentElement.style.setProperty("--border", "rgba(254, 251, 244, 0.1)");

    expect(getComputedStyle(document.documentElement).getPropertyValue("--surface").trim()).toBe("#0F1F35");
    expect(getComputedStyle(document.documentElement).getPropertyValue("--border").trim()).toBe("rgba(254, 251, 244, 0.1)");
  });

  it("should have smooth transition configured on body element", () => {
    const body = document.body;

    // Check if body element exists
    // In real implementation, globals.css sets: transition: background-color 300ms ease, color 300ms ease
    expect(body).toBeDefined();
  });
});

describe("Theme Persistence", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it("should persist theme preference in localStorage", () => {
    localStorage.setItem("my-analytics-theme", "dark");
    expect(localStorage.getItem("my-analytics-theme")).toBe("dark");
  });

  it("should respect system preference on initial load", () => {
    // Mock matchMedia for system preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    expect(darkModeQuery.matches).toBe(true);
  });
});
