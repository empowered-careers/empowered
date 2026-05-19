# Next.js Starter

A modern, production-ready Next.js starter template with TypeScript, Tailwind CSS v4, shadcn/ui, Supabase, and comprehensive tooling.

## 🚀 Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React features
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first CSS framework with CSS-first approach
- **shadcn/ui** - Beautiful, accessible UI components

### Backend & Database

- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Authentication** - Built-in auth with multiple providers
- **Real-time** - Live data synchronization
- **Storage** - File upload and management
- **Row Level Security (RLS)** - Database security policies

### State Management & UI

- **Auth Provider** - Centralized authentication state management
- **Modal Provider** - Global modal system with shadcn Dialog
- **Query Provider** - TanStack Query for server state management
- **Theme Provider** - Dark/light mode with next-themes
- **Toast Notifications** - Sonner for user feedback

### Development Tools

- **Biome** - Fast linter and formatter (replaces ESLint/Prettier)
- **Ultracite** - AI-ready code quality tools
- **Husky** - Git hooks for code quality
- **next-themes** - Dark/light mode support
- **Zod** - Runtime environment validation
- **GitHub Actions** - CI/CD pipeline

## 🛠️ Getting Started

### Prerequisites

- **Node.js 20.11.0 LTS** (pinned in `.nvmrc`)
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd nextjs-starter-gt
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Git hooks**

   ```bash
   npm run prepare
   ```

4. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
nextjs-starter-gt/
├── .github/
│   └── workflows/
│       └── ci.yml         # GitHub Actions CI/CD
├── .husky/
│   └── pre-commit         # Git hooks
├── .vscode/
│   └── settings.json      # VS Code configuration
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/
│   │   │   ├── health/    # Health check endpoint
│   │   │   └── og/        # Open Graph image generator
│   │   ├── dashboard/     # Protected route example
│   │   │   ├── layout.tsx # Dashboard metadata
│   │   │   └── page.tsx   # Dashboard page
│   │   ├── login/         # Auth page example
│   │   │   ├── layout.tsx # Login metadata
│   │   │   └── page.tsx   # Login page
│   │   ├── error.tsx      # Error boundary
│   │   ├── loading.tsx    # Loading UI
│   │   ├── not-found.tsx  # 404 page
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Homepage
│   │   ├── robots.ts      # SEO robots configuration
│   │   └── sitemap.ts     # XML sitemap generation
│   ├── components/        # React components
│   │   ├── providers/     # Context providers
│   │   │   ├── auth-provider.tsx    # Authentication state
│   │   │   ├── modal-provider.tsx   # Global modal system
│   │   │   ├── query-provider.tsx   # TanStack Query setup
│   │   │   └── theme-provider.tsx   # Dark/light mode
│   │   ├── ui/            # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...        # Other UI components
│   │   ├── header.tsx     # Site header with theme toggle
│   │   └── page-shell.tsx # Layout wrapper
│   ├── hooks/             # Custom React hooks
│   │   ├── use-user.ts           # User data query
│   │   └── use-supabase-query.ts # Supabase query utilities
│   ├── lib/
│   │   ├── supabase/      # Supabase configuration
│   │   │   ├── client.ts  # Browser client
│   │   │   ├── server.ts  # Server client
│   │   │   └── auth-helpers.ts # Auth utilities
│   │   └── utils.ts       # Utility functions
│   └── types/
│       └── supabase.ts    # TypeScript types
├── .editorconfig          # Editor configuration
├── .gitattributes         # Git line ending config
├── .nvmrc                 # Node version
├── env.ts                 # Environment validation
├── middleware.ts          # Auth middleware
├── biome.json             # Biome configuration
├── components.json        # shadcn/ui config
├── package.json           # Dependencies & scripts
├── tailwind.config.ts     # Tailwind CSS v4 config
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript config
├── LICENSE                # MIT License
├── SECURITY.md            # Security policy
├── CODE_OF_CONDUCT.md     # Code of conduct
└── README.md              # This file
```

## 🎨 Available Components

This starter includes pre-configured shadcn/ui components:

- **Button** - Various styles and sizes
- **Card** - Content containers
- **Input** - Form inputs
- **Separator** - Visual dividers
- **Progress** - Progress indicators
- **Alert** - Notifications and alerts
- **Switch** - Toggle switches
- **Toggle** - Toggle buttons
- **Sonner** - Toast notifications

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server

# Code Quality & Type Checking
npm run type-check   # TypeScript type checking
npm run check        # Run Ultracite checks (linting)
npm run format       # Format code with Ultracite
npm run fix          # Fix issues automatically

# Supabase (when configured)
npm run supabase:types  # Generate TypeScript types
```

## 🌙 Theme Support

The starter includes dark/light mode support using `next-themes`:

- System preference detection
- Manual theme switching
- Persistent theme selection
- Tailwind CSS dark mode classes
- ThemeProvider and Toaster wired in `layout.tsx`

## 🔐 Supabase Setup

> **📢 Migration Notice**: This starter now uses Supabase's new `publishable` key instead of the legacy `anon` key. If you're migrating from an older version, update your environment variables accordingly.

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Get your project credentials**
   - Project URL
   - Publishable key

3. **Update environment variables**

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

4. **Generate TypeScript types** (optional)

   ```bash
   npm run supabase:types
   ```

   **Note**: `src/types/supabase.ts` is generated automatically - do not edit manually.

5. **Enable Row Level Security (RLS)**
   ⚠️ **Important**: Production requires RLS policies on all tables. See [Supabase RLS documentation](https://supabase.com/docs/guides/auth/row-level-security).

## 🎯 Features

### Core Framework

- ✅ **Next.js 15** with App Router and Turbopack
- ✅ **React 19** with latest features
- ✅ **TypeScript** strict mode with path aliases
- ✅ **Tailwind CSS v4** with CSS-first approach (no PostCSS config)
- ✅ **shadcn/ui** components with Radix UI primitives

### Backend & Database

- ✅ **Supabase** integration with SSR support
- ✅ **Authentication** with centralized state management
- ✅ **Real-time** data synchronization
- ✅ **Row Level Security (RLS)** for database security

### State Management & UI

- ✅ **Auth Provider** - Centralized authentication with React Context
- ✅ **Modal Provider** - Global modal system with shadcn Dialog
- ✅ **Query Provider** - TanStack Query for server state management
- ✅ **Theme Provider** - Dark/light mode with next-themes
- ✅ **Toast Notifications** - Sonner for user feedback

### Development & Quality

- ✅ **Biome** linting and formatting (replaces ESLint/Prettier)
- ✅ **Ultracite** AI-ready code quality tools
- ✅ **Husky** pre-commit hooks with lint-staged
- ✅ **GitHub Actions** CI/CD pipeline
- ✅ **Environment validation** with Zod

### Production Ready

- ✅ **Error boundaries** (`error.tsx`, `not-found.tsx`, `loading.tsx`)
- ✅ **Health check** API endpoint (`/api/health`)
- ✅ **Auth middleware** for protected routes (`/dashboard/*`)
- ✅ **Responsive design** with mobile-first approach
- ✅ **Accessibility** features (WCAG compliant)
- ✅ **Production-ready** configuration

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

This starter works with any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🎯 Using the Providers

### Auth Provider

The `AuthProvider` provides centralized authentication state management:

```tsx
import { useAuth } from "@/components/providers/auth-provider";

function MyComponent() {
  const { user, isLoading, signIn, signOut } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn(email, password)}>Sign In</button>
      )}
    </div>
  );
}
```

### Modal Provider

The `ModalProvider` provides a global modal system:

```tsx
import { useModal } from "@/components/providers/modal-provider";

function MyComponent() {
  const { openModal } = useModal();

  const showConfirmation = () => {
    openModal({
      type: "confirmation",
      title: "Confirm Action",
      description: "Are you sure you want to continue?",
      confirmText: "Yes, continue",
      cancelText: "Cancel",
      onConfirm: () => {
        console.log("Confirmed!");
      },
    });
  };

  return <button onClick={showConfirmation}>Show Modal</button>;
}
```

### Query Provider (TanStack Query)

The `QueryProvider` provides powerful data fetching and caching:

```tsx
import { useUser } from "@/hooks/use-user";
import {
  useSupabaseQuery,
  useSupabaseMutation,
} from "@/hooks/use-supabase-query";

function MyComponent() {
  // Use the built-in user query
  const { data: user, isLoading, error } = useUser();

  // Custom Supabase query
  const { data: posts, isLoading: postsLoading } = useSupabaseQuery(
    ["posts"],
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("posts").select("*");
      if (error) throw error;
      return data;
    }
  );

  // Mutation with automatic cache invalidation
  const createPost = useSupabaseMutation(
    async (postData) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("posts")
        .insert([postData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    {
      invalidateQueries: [["posts"]], // Refetch posts after creating
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Welcome, {user?.email}!</h1>
      <button onClick={() => createPost.mutate({ title: "New Post" })}>
        Create Post
      </button>
    </div>
  );
}
```

## 🤖 AI Development Tools

This starter includes AI-powered development tools:

- **`.cursor/`** - Cursor AI editor configuration and rules
- **`.kilocode/`** - Kilocode AI tooling for enhanced development
- **`.rules`** - AI coding rules and guidelines for consistent code generation

These artifacts help maintain code quality and consistency when using AI assistants. They're safe to commit and share with your team.

## 🚀 Common Tasks

### Adding a New Page

```bash
# Create a new page
mkdir src/app/your-page
touch src/app/your-page/page.tsx
```

### Adding a Protected Route

1. Create your page in `src/app/protected-route/`
2. The middleware will automatically protect it
3. Users will be redirected to `/login` if not authenticated

### Adding a shadcn/ui Component

```bash
# Add a new component (installs to src/components/ui/)
npx shadcn@latest add [component-name]

# Example: Add a dialog component
npx shadcn@latest add dialog
```

### Generating Supabase Types

```bash
# Generate TypeScript types from your Supabase schema
npm run supabase:types
```

### Code Quality Commands

```bash
# Check for issues
npm run check

# Format code
npm run format

# Fix issues automatically
npm run fix

# Type check
npm run type-check
```

### Environment Variables

The project includes Zod validation for environment variables in `env.ts`. Add new variables there and update `.env.local.example`:

```typescript
// env.ts
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Add your new variables here
  NEXT_PUBLIC_APP_NAME: z.string().default("Next.js Starter"),
});
```

### Migrating from Legacy Supabase Keys

If you're updating from a project using the legacy `anon` key, follow these steps:

1. **Update your environment variables**:

   ```bash
   # Old (legacy)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

   # New (current)
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

2. **Get your new publishable key** from your Supabase dashboard:
   - Go to your project settings
   - Navigate to API settings
   - Copy the new "Publishable" key (starts with `sb_publishable_...`)

3. **Update your deployment environment** (Vercel, Netlify, etc.) with the new environment variable name.

**Note**: The new publishable key provides the same functionality as the legacy anon key but with enhanced security and better key management.

**Note**: Store secrets in your deployment platform (Vercel/Actions secrets), not in `.env.local`.

### Error Boundaries & UX

The starter includes built-in error handling:

- `error.tsx` - Catches JavaScript errors in route segments
- `not-found.tsx` - 404 page for unknown routes
- `loading.tsx` - Loading UI for async operations
- `/api/health` - Health check endpoint (returns status, version, environment)
- `/api/og` - Dynamic Open Graph image generator for social sharing
- `/robots.txt` - SEO robots configuration
- `/sitemap.xml` - XML sitemap for search engines

### Open Graph Image Generator

Generate dynamic OG images for social sharing:

```bash
# Basic OG image
curl "http://localhost:3000/api/og?title=My%20Page&description=This%20is%20my%20page"

# With custom theme
curl "http://localhost:3000/api/og?title=My%20Page&description=This%20is%20my%20page&theme=dark"
```

**Parameters:**

- `title` - Page title (default: "Next.js Starter")
- `description` - Page description
- `theme` - "light" or "dark" (default: "light")

### SEO & Metadata

The starter includes comprehensive SEO features:

- **Title templates** - Automatic page titles with site name
- **Open Graph** - Dynamic OG images for social sharing
- **Twitter Cards** - Optimized for Twitter sharing
- **Robots.txt** - Search engine crawling rules
- **Sitemap.xml** - Automatic XML sitemap generation
- **Canonical URLs** - Proper URL canonicalization
- **Meta tags** - Keywords, descriptions, and author info

**Example page metadata:**

```tsx
export const metadata: Metadata = {
  title: "My Page",
  description: "Page description",
  openGraph: {
    title: "My Page",
    description: "Page description",
    images: ["/api/og?title=My%20Page&description=Page%20description"],
  },
};
```

### Health Check Endpoint

Test the health endpoint:

```bash
curl http://localhost:3000/api/health
# Returns: {"status":"ok","timestamp":"...","version":"1.0.0","environment":"development"}
```

### Why Biome/Ultracite (No ESLint/Prettier)?

- **Faster**: Single tool for linting and formatting
- **Zero Config**: Works out of the box with sensible defaults
- **AI-Ready**: Optimized for modern development workflows
- **TypeScript First**: Better TypeScript support than ESLint
- **Consistent**: Unified rules and formatting across the project

## 🔧 VS Code Setup

### Recommended Extensions

Install these VS Code extensions for the best experience:

```json
{
  "recommendations": [
    "biomejs.biome",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

The project includes `.vscode/settings.json` with:

- Biome as default formatter
- Format on save enabled
- Tailwind IntelliSense configured
- ESLint disabled (using Biome instead)

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Biome Documentation](https://biomejs.dev)
- [Ultracite Documentation](https://ultracite.dev)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) team for the amazing framework
- [Tailwind CSS](https://tailwindcss.com) for the utility-first CSS
- [shadcn](https://ui.shadcn.com) for the beautiful components
- [Supabase](https://supabase.com) for the backend platform
- [Vercel](https://vercel.com) for the deployment platform
