# CRM Frontend Branding Guide

## Logo Usage

The company logo (`/public/logo.jpg`) is now consistently used throughout the application via the `Logo` component.

### Logo Component

Located at: `src/components/common/Logo.jsx`

**Props:**
- `size`: 'small' | 'medium' | 'large' | 'xlarge' (default: 'medium')
- `showText`: boolean (default: true) - Shows/hides the "IT CRM System" text
- `className`: string - Additional CSS classes

**Usage Examples:**
```jsx
import Logo from '../common/Logo';

// Full logo with text (medium size)
<Logo />

// Large logo for login page
<Logo size="large" />

// Small logo without text for header
<Logo size="small" showText={false} />
```

### Logo Locations

1. **Login Page** - Large logo with text and subtitle
2. **Sidebar** - Medium logo with text and user info
3. **Header** - Small logo without text next to welcome message

## Color Scheme

### Primary Colors
- **Primary 50**: `#eff6ff` - Light backgrounds, loading screens
- **Primary 500**: `#3b82f6` - Interactive elements
- **Primary 600**: `#2563eb` - Main brand color, buttons, links
- **Primary 700**: `#1d4ed8` - Hover states, active elements

### Usage Guidelines

1. **Primary-600** (`#2563eb`) is the main brand color used for:
   - Logo text
   - Primary buttons
   - Active navigation items
   - User role text
   - Notification badges

2. **Primary-50** (`#eff6ff`) is used for:
   - Loading screen backgrounds
   - Light accent backgrounds
   - Hover states for interactive elements

3. **Consistent Application:**
   - All interactive elements use the primary color scheme
   - Loading spinners use primary-600
   - Toast notifications use primary colors for success states
   - Form focus states use primary colors

## Components Updated

- ✅ `Logo.jsx` - New reusable logo component
- ✅ `Login.jsx` - Large logo, primary color background
- ✅ `Sidebar.jsx` - Medium logo with improved layout
- ✅ `Header.jsx` - Small logo, primary color accents
- ✅ `App.jsx` - Primary color loading states and placeholder pages
- ✅ `index.css` - Logo hover effects and primary color utilities

## Best Practices

1. Always use the `Logo` component instead of directly referencing the image
2. Maintain consistent sizing across similar contexts
3. Use primary colors for all brand-related elements
4. Ensure logo has proper contrast against backgrounds
5. Test logo visibility in both light and dark contexts