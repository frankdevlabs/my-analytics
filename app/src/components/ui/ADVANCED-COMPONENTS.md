# Advanced Components Guide

This guide covers the navigation, table, dropdown, dialog, toast, and alert components that follow Frank's Blog minimal aesthetic.

## Table of Contents
1. [Navigation Menu](#navigation-menu)
2. [Table](#table)
3. [Dropdown Menu](#dropdown-menu)
4. [Popover](#popover)
5. [Dialog/Modal](#dialog-modal)
6. [Alert Dialog](#alert-dialog)
7. [Toast](#toast)
8. [Alert](#alert)
9. [Responsive Patterns](#responsive-patterns)

---

## Navigation Menu

Text-based navigation with hover underline effects following Frank's Blog aesthetic.

### Basic Usage

```tsx
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

function SiteNav() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink href="/dashboard" className={navigationMenuTriggerStyle()}>
            Dashboard
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/analytics" className={navigationMenuTriggerStyle()}>
            Analytics
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
```

### With Dropdown

```tsx
function NavWithDropdown() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Reports</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="p-4 w-[400px]">
              <ul className="grid gap-3">
                <li>
                  <NavigationMenuLink href="/reports/daily">
                    Daily Report
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="/reports/weekly">
                    Weekly Report
                  </NavigationMenuLink>
                </li>
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
```

### Features
- Minimal text-based design
- Hover underline effect via `box-shadow`
- Active state indicated by accent color
- 300ms smooth transitions
- Fully keyboard accessible

---

## Table

Optimized for data density with proper row height and readability.

### Basic Usage

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function DataTable() {
  return (
    <Table>
      <TableCaption>Analytics data for Q4 2024</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead>Value</TableHead>
          <TableHead className="text-right">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Page Views</TableCell>
          <TableCell>12,543</TableCell>
          <TableCell className="text-right text-accent">+12%</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Unique Visitors</TableCell>
          <TableCell>8,921</TableCell>
          <TableCell className="text-right text-accent">+8%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
```

### Responsive Table

```tsx
function ResponsiveTable() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Date</TableHead>
            <TableHead className="min-w-[100px]">Users</TableHead>
            <TableHead className="min-w-[100px]">Sessions</TableHead>
            <TableHead className="min-w-[120px]">Bounce Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Table rows */}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Features
- Compact row height with `leading-tight` (line-height: 1.25)
- Subtle 1px borders using `--border` color
- Hover state with `hover:bg-surface/50`
- Medium font weight (500) for headers
- Automatic horizontal scroll on mobile
- 200ms transition for smooth hover effects

---

## Dropdown Menu

Context menu with correct elevation and smooth animations.

### Basic Usage

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### With Checkboxes

```tsx
import {
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"

function FilterMenu() {
  const [showActive, setShowActive] = React.useState(true)
  const [showInactive, setShowInactive] = React.useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Filter</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showActive}
          onCheckedChange={setShowActive}
        >
          Active
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showInactive}
          onCheckedChange={setShowInactive}
        >
          Inactive
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Features
- z-index: 50 for proper layering
- Medium shadow (2-4px blur) for elevation
- 4px border radius
- Surface background with border
- 200ms smooth fade-in animation
- Hover state: `accent/10` background
- Keyboard navigation support

---

## Popover

Floating content with proper positioning and elevation.

### Basic Usage

```tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

function InfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">More Info</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Analytics Tip</h4>
            <p className="text-sm text-text-secondary">
              Track user behavior to optimize your dashboard layout.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### Features
- z-index: 50 for proper layering
- Medium shadow for elevation
- 4px border radius
- Default width: 288px (w-72)
- Smooth zoom and slide animations
- Positioned relative to trigger

---

## Dialog/Modal

Full-featured modal with overlay, focus trap, and accessibility.

### Basic Usage

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function EditDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Form fields */}
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Features
- Dark overlay with 80% opacity and backdrop blur
- z-index: 50 for proper layering
- Large shadow (4-8px blur) for strong elevation
- 4px border radius
- Max width: 512px (max-w-lg)
- Close button with accessible label
- Focus trap for keyboard navigation
- Smooth zoom and slide animations
- ESC key to close

---

## Alert Dialog

For important confirmations requiring user action.

### Basic Usage

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

function DeleteConfirmation() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Features
- Similar styling to Dialog
- Focused on confirmation actions
- Two-button pattern (Cancel + Action)
- Cannot be dismissed by clicking overlay
- Must explicitly cancel or confirm
- Full keyboard support

---

## Toast

Temporary notifications that slide in from the corner.

### Setup

First, add the Toaster to your root layout:

```tsx
// app/layout.tsx
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

### Basic Usage

```tsx
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

function NotificationExample() {
  const { toast } = useToast()

  return (
    <Button
      onClick={() => {
        toast({
          title: "Success!",
          description: "Your changes have been saved.",
        })
      }}
    >
      Save
    </Button>
  )
}
```

### With Variants

```tsx
function VariantExamples() {
  const { toast } = useToast()

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => {
          toast({
            variant: "default",
            title: "Information",
            description: "This is a default toast notification.",
          })
        }}
      >
        Default
      </Button>

      <Button
        onClick={() => {
          toast({
            variant: "success",
            title: "Success",
            description: "Operation completed successfully!",
          })
        }}
      >
        Success
      </Button>

      <Button
        onClick={() => {
          toast({
            variant: "warning",
            title: "Warning",
            description: "Please review your input.",
          })
        }}
      >
        Warning
      </Button>

      <Button
        onClick={() => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Something went wrong.",
          })
        }}
      >
        Error
      </Button>
    </div>
  )
}
```

### Features
- Slide-in animation from corner
- Auto-dismiss after timeout
- Multiple variants with semantic colors
- Mobile-responsive positioning
- Swipe to dismiss on mobile
- Maximum 1 toast visible at a time
- Accessible with ARIA labels

---

## Alert

Static alert messages for important information.

### Basic Usage

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function AlertExample() {
  return (
    <Alert>
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the CLI.
      </AlertDescription>
    </Alert>
  )
}
```

### With Variants

```tsx
function AlertVariants() {
  return (
    <div className="space-y-4">
      <Alert variant="default">
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          This is a default informational alert.
        </AlertDescription>
      </Alert>

      <Alert variant="success">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>
          Your changes have been saved successfully.
        </AlertDescription>
      </Alert>

      <Alert variant="warning">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Please review your settings before proceeding.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          An error occurred while processing your request.
        </AlertDescription>
      </Alert>
    </div>
  )
}
```

### Features
- Static (always visible)
- Four semantic variants
- 4px border radius
- Colored left border for variant indication
- Minimal shadow
- Full width by default

---

## Responsive Patterns

### Breakpoints

Following Tailwind's standard breakpoints:

- **Mobile**: < 768px (default/no prefix)
- **Tablet**: 768px (`md:`)
- **Desktop**: 1024px (`lg:`)

### Mobile-First Approach

All components are designed mobile-first and progressively enhanced:

```tsx
// Navigation: Collapsible on mobile
<nav className="flex flex-col md:flex-row gap-4">
  <a href="/dashboard">Dashboard</a>
  <a href="/analytics">Analytics</a>
</nav>

// Table: Horizontal scroll on mobile
<div className="overflow-x-auto">
  <Table>
    {/* Table content */}
  </Table>
</div>

// Cards: Stack on mobile, grid on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
</div>
```

### Touch-Friendly Targets

All interactive elements meet the 44x44px minimum:

- Button `lg` size: 44px height (h-11)
- Table rows: Adequate padding for touch
- Dropdown items: 1.5rem padding (py-1.5)

### Responsive Tables

```tsx
function ResponsiveDataTable() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-surface z-10 min-w-[150px]">
              Date
            </TableHead>
            <TableHead className="min-w-[100px]">Metric 1</TableHead>
            <TableHead className="min-w-[100px]">Metric 2</TableHead>
            <TableHead className="min-w-[100px]">Metric 3</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Rows with sticky first column */}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Modal Responsiveness

Dialogs automatically adapt to mobile screens:

```tsx
<DialogContent className="max-w-[95vw] md:max-w-lg">
  {/* Content automatically responsive */}
</DialogContent>
```

---

## Best Practices

### Accessibility
- Always use semantic HTML elements
- Provide ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain focus indicators

### Performance
- Use `asChild` prop to avoid extra DOM nodes
- Lazy load dialogs and popovers
- Limit toast notifications to prevent overwhelming users
- Use table virtualization for large datasets

### Design Consistency
- Use design tokens (CSS variables) exclusively
- Follow 4px border radius consistently
- Apply minimal shadows sparingly
- Use 300ms transition duration
- Maintain Frank's Blog aesthetic

### Keyboard Shortcuts
- ESC: Close dialogs/dropdowns
- TAB: Navigate through interactive elements
- ENTER: Activate focused element
- SPACE: Toggle checkboxes/select items
- Arrow keys: Navigate menus and lists

---

## Troubleshooting

### Components not styled correctly
- Ensure `globals.css` is imported in your layout
- Verify CSS variables are defined
- Check that Tailwind is processing the files

### Focus indicators not visible
- Verify `:focus-visible` styles in globals.css
- Check that `--accent` color is defined
- Test in different browsers

### Toast not appearing
- Ensure `<Toaster />` is added to your layout
- Check that toast is being called correctly
- Verify z-index is not being overridden

### Table overflow not working
- Wrap table in `<div className="overflow-x-auto">`
- Add min-width to columns if needed
- Test on actual mobile device

### Dropdown positioning issues
- Check z-index conflicts
- Ensure parent container doesn't have `overflow: hidden`
- Use `sideOffset` prop to adjust positioning
