# Design Document

## Overview

The Rich Email Design System extends NexaSuit's email capabilities from basic rich text editing to a comprehensive visual email design platform. The system enables users to create professionally designed, responsive HTML emails using a drag-and-drop interface with pre-built templates and blocks. The implementation balances powerful design capabilities with mobile performance constraints, leveraging proven email design libraries while maintaining the React Native architecture.

### Design Philosophy

1. **Mobile-First Performance**: Optimize for React Native mobile environment with lazy loading, progressive rendering, and efficient state management
2. **Email Client Compatibility**: Generate HTML that renders consistently across all major email clients using table-based layouts and inline CSS
3. **Visual Simplicity**: Provide intuitive drag-and-drop interface that abstracts HTML complexity from users
4. **Extensibility**: Build modular block system that allows easy addition of new components and templates
5. **SendGrid Integration**: Leverage SendGrid's HTML email delivery capabilities while maintaining compatibility with other providers

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Email Composer  │  │  Template        │                │
│  │  (Existing)      │  │  Library         │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                            │
│           └─────────┬───────────┘                            │
│                     │                                        │
│           ┌─────────▼──────────┐                            │
│           │  Design Mode       │                            │
│           │  Selector          │                            │
│           └─────────┬──────────┘                            │
│                     │                                        │
│     ┌───────────────┴───────────────┐                       │
│     │                               │                       │
│ ┌───▼────────────┐      ┌──────────▼────────┐              │
│ │ Visual Email   │      │ Block Library     │              │
│ │ Editor         │◄─────┤ Component         │              │
│ └───┬────────────┘      └───────────────────┘              │
│     │                                                        │
│ ┌───▼────────────┐      ┌───────────────────┐              │
│ │ Email Renderer │      │ Style Manager     │              │
│ │ (Preview)      │◄─────┤                   │              │
│ └───┬────────────┘      └───────────────────┘              │
│     │                                                        │
│ ┌───▼────────────┐      ┌───────────────────┐              │
│ │ HTML Generator │      │ Compatibility     │              │
│ │                │◄─────┤ Checker           │              │
│ └───┬────────────┘      └───────────────────┘              │
└─────┼────────────────────────────────────────────────────────┘
      │
```

      │
      ▼

┌─────────────────────────────────────────────────────────────┐
│ Supabase Backend │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ email_templates │ │ email_designs │ │
│ │ (Enhanced) │ │ (New Table) │ │
│ └──────────────────┘ └──────────────────┘ │
│ │
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ design_blocks │ │ email_analytics │ │
│ │ (New Table) │ │ (Enhanced) │ │
│ └──────────────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│ SendGrid API │
├─────────────────────────────────────────────────────────────┤
│ • HTML Email Delivery │
│ • Template Rendering │
│ • Tracking & Analytics │
└─────────────────────────────────────────────────────────────┘

````

### Component Architecture

The system follows a modular architecture with clear separation of concerns:

1. **Presentation Layer**: React Native components for UI
2. **Business Logic Layer**: Email design state management and operations
3. **Data Layer**: Supabase database for persistence
4. **Integration Layer**: SendGrid API for email delivery

## Components and Interfaces

### 1. Design Mode Selector Component

**Purpose**: Toggle between basic rich text editor and visual design mode

**Interface**:
```typescript
interface DesignModeSelectorProps {
  currentMode: 'basic' | 'design';
  onModeChange: (mode: 'basic' | 'design') => void;
  hasExistingContent: boolean;
}
````

**Behavior**:

- Displays toggle switch or tab selector
- Shows confirmation dialog when switching modes with unsaved content
- Persists user's preferred mode in local storage

### 2. Visual Email Editor Component

**Purpose**: Main canvas for designing emails with drag-and-drop functionality

**Interface**:

```typescript
interface VisualEmailEditorProps {
  initialDesign?: EmailDesign;
  onSave: (design: EmailDesign) => Promise<void>;
  onPreview: (html: string) => void;
  onSend: (html: string, plainText: string) => Promise<void>;
}

interface EmailDesign {
  id: string;
  name: string;
  blocks: EmailBlock[];
  theme: DesignTheme;
  metadata: DesignMetadata;
}

interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  styles: BlockStyles;
  children?: EmailBlock[];
}

type BlockType =
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'header'
  | 'footer'
  | 'social'
  | 'hero';

interface BlockStyles {
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  borderRadius?: string;
  // ... additional style properties
}

interface DesignTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  fontFamily: string;
}

interface DesignMetadata {
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
}
```

**Key Features**:

- Drag-and-drop interface using `react-native-draggable-flatlist`
- Real-time preview rendering
- Undo/redo functionality
- Block selection and manipulation
- Responsive preview modes (mobile/desktop)

### 3. Block Library Component

**Purpose**: Sidebar displaying available email blocks for insertion

**Interface**:

```typescript
interface BlockLibraryProps {
  onBlockSelect: (blockType: BlockType) => void;
  categories: BlockCategory[];
  searchQuery?: string;
}

interface BlockCategory {
  id: string;
  name: string;
  icon: string;
  blocks: BlockDefinition[];
}

interface BlockDefinition {
  type: BlockType;
  name: string;
  description: string;
  thumbnail: string;
  defaultContent: Record<string, any>;
  defaultStyles: BlockStyles;
}
```

**Behavior**:

- Categorized block display
- Search and filter functionality
- Drag initiation for block insertion
- Preview on hover/long-press

### 4. Template Library Component

**Purpose**: Display and manage pre-built email templates

**Interface**:

```typescript
interface TemplateLibraryProps {
  onTemplateSelect: (template: EmailTemplate) => void;
  onTemplatePreview: (template: EmailTemplate) => void;
  categories: TemplateCategory[];
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  design: EmailDesign;
  isCustom: boolean;
  usageCount?: number;
  performanceMetrics?: TemplateMetrics;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: EmailTemplate[];
}

interface TemplateMetrics {
  openRate: number;
  clickRate: number;
  replyRate: number;
  totalSent: number;
}
```

### 5. Block Editor Component

**Purpose**: Edit individual block properties and content

**Interface**:

```typescript
interface BlockEditorProps {
  block: EmailBlock;
  onUpdate: (block: EmailBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}
```

**Features**:

- Inline text editing
- Image upload and management
- Link editor
- Style customization panel
- Responsive settings

### 6. HTML Generator Service

**Purpose**: Convert email design to production-ready HTML

**Interface**:

```typescript
interface HTMLGeneratorService {
  generateHTML(design: EmailDesign): string;
  generatePlainText(design: EmailDesign): string;
  validateHTML(html: string): ValidationResult;
  optimizeHTML(html: string): string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  line?: number;
  suggestion?: string;
}

interface ValidationWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}
```

**Implementation Strategy**:

- Use table-based layouts for maximum compatibility
- Inline all CSS styles
- Generate responsive media queries
- Include fallbacks for unsupported features
- Optimize image references
- Add proper DOCTYPE and meta tags

### 7. Compatibility Checker Service

**Purpose**: Validate email design across different email clients

**Interface**:

```typescript
interface CompatibilityCheckerService {
  checkCompatibility(html: string): CompatibilityReport;
  getClientSupport(feature: string): ClientSupport[];
  suggestFixes(issues: CompatibilityIssue[]): Fix[];
}

interface CompatibilityReport {
  overallScore: number;
  clientResults: ClientResult[];
  issues: CompatibilityIssue[];
  recommendations: string[];
}

interface ClientResult {
  client: EmailClient;
  score: number;
  supportedFeatures: string[];
  unsupportedFeatures: string[];
}

type EmailClient =
  | 'gmail'
  | 'outlook'
  | 'apple-mail'
  | 'yahoo'
  | 'outlook-mobile'
  | 'gmail-mobile';

interface CompatibilityIssue {
  feature: string;
  affectedClients: EmailClient[];
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

interface Fix {
  issue: CompatibilityIssue;
  solution: string;
  autoFixAvailable: boolean;
  applyFix?: () => void;
}
```

### 8. Email Renderer Component

**Purpose**: Preview email design in real-time

**Interface**:

```typescript
interface EmailRendererProps {
  design: EmailDesign;
  viewMode: 'mobile' | 'tablet' | 'desktop';
  showGridLines?: boolean;
  interactive?: boolean;
}
```

**Implementation**:

- Use WebView for HTML rendering
- Support device preview modes
- Handle responsive breakpoints
- Show visual guides for spacing

## Data Models

### Database Schema Extensions

#### email_designs Table (New)

```sql
CREATE TABLE email_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  design_json JSONB NOT NULL, -- Complete EmailDesign structure
  thumbnail_url TEXT,
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES email_designs(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_designs_user_id ON email_designs(user_id);
CREATE INDEX idx_email_designs_category ON email_designs(category);
CREATE INDEX idx_email_designs_is_template ON email_designs(is_template);
CREATE INDEX idx_email_designs_tags ON email_designs USING GIN(tags);
```

#### design_blocks Table (New)

```sql
CREATE TABLE design_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  block_type VARCHAR(50) NOT NULL,
  block_json JSONB NOT NULL, -- EmailBlock structure
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_design_blocks_user_id ON design_blocks(user_id);
CREATE INDEX idx_design_blocks_type ON design_blocks(block_type);
```

#### email_templates Table (Enhanced)

```sql
-- Add new columns to existing table
ALTER TABLE email_templates
ADD COLUMN design_id UUID REFERENCES email_designs(id),
ADD COLUMN is_visual_design BOOLEAN DEFAULT false,
ADD COLUMN thumbnail_url TEXT;

CREATE INDEX idx_email_templates_design_id ON email_templates(design_id);
```

#### email_communications Table (Enhanced)

```sql
-- Add new columns for design tracking
ALTER TABLE email_communications
ADD COLUMN design_id UUID REFERENCES email_designs(id),
ADD COLUMN design_version INTEGER;

CREATE INDEX idx_email_communications_design_id ON email_communications(design_id);
```

### TypeScript Data Models

```typescript
// Core design structure stored in design_json
interface EmailDesignData {
  version: string; // Schema version for migrations
  blocks: EmailBlock[];
  theme: DesignTheme;
  settings: DesignSettings;
}

interface DesignSettings {
  width: number; // Email width in pixels (typically 600)
  backgroundColor: string;
  contentPadding: string;
  fontFamily: string;
  responsive: boolean;
  darkModeSupport: boolean;
}

// Block content structures by type
interface TextBlockContent {
  html: string;
  plainText: string;
}

interface ImageBlockContent {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  link?: string;
  alignment: 'left' | 'center' | 'right';
}

interface ButtonBlockContent {
  text: string;
  link: string;
  openInNewTab: boolean;
}

interface ColumnsBlockContent {
  columnCount: 2 | 3 | 4;
  columns: EmailBlock[][];
}

interface SocialBlockContent {
  platforms: SocialPlatform[];
  iconStyle: 'color' | 'grayscale' | 'outline';
  iconSize: number;
}

interface SocialPlatform {
  name: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'youtube';
  url: string;
}

interface HeroBlockContent {
  backgroundImage?: string;
  backgroundColor?: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  height: number;
  overlay?: boolean;
  overlayOpacity?: number;
}
```

## Technology Stack

### Core Libraries

1. **react-native-render-html** (v6.3+)

   - Purpose: Render HTML content in React Native
   - Usage: Preview email designs in mobile app
   - Justification: Mature library with good performance

2. **react-native-webview** (v13.0+)

   - Purpose: Full HTML rendering with CSS support
   - Usage: High-fidelity email preview
   - Justification: Required for complex HTML/CSS rendering

3. **react-native-draggable-flatlist** (v4.0+)

   - Purpose: Drag-and-drop functionality
   - Usage: Reorder email blocks
   - Justification: Performant drag-and-drop for React Native

4. **juice** (v10.0+)

   - Purpose: Inline CSS into HTML
   - Usage: Generate email-compatible HTML
   - Justification: Industry standard for email CSS inlining

5. **html-to-text** (v9.0+)
   - Purpose: Convert HTML to plain text
   - Usage: Generate plain text version of emails
   - Justification: Reliable HTML parsing and conversion

### Optional Enhancement Libraries

1. **mjml-react** (if using MJML approach)

   - Purpose: MJML to HTML compilation
   - Usage: Generate responsive email HTML
   - Note: May need custom React Native port

2. **react-native-color-picker** (v0.6+)

   - Purpose: Color selection UI
   - Usage: Theme and style customization

3. **react-native-image-crop-picker** (v0.40+)
   - Purpose: Image selection and cropping
   - Usage: Image block content management

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Template Round-Trip Consistency

_For any_ customized email template, saving and then loading it should produce an identical design structure with all blocks, styles, and content preserved.

**Validates: Requirements 1.7**

### Property 2: Block Insertion Positioning

_For any_ email block type and any valid drop location in the canvas, dragging and dropping the block should insert it at exactly that location in the block array.

**Validates: Requirements 2.2**

### Property 3: Block Deletion Reduces Count

_For any_ email design with N blocks, deleting a block should result in a design with N-1 blocks, and the deleted block should not appear in the structure.

**Validates: Requirements 2.4**

### Property 4: Block Duplication Creates Identical Copy

_For any_ email block with specific content and styling, duplicating it should create a new block with identical content, styles, and nested structure (but different ID).

**Validates: Requirements 2.5**

### Property 5: Theme Color Propagation

_For any_ email design, changing a theme color should update all blocks that reference that theme color, and no blocks should retain the old color value.

**Validates: Requirements 4.2**

### Property 6: Web-Safe Font Restriction

_For any_ font option presented in the font selector, it should be from the predefined list of web-safe fonts that render consistently across email clients.

**Validates: Requirements 4.5**

### Property 7: Responsive HTML Generation

_For any_ email design, the generated HTML should include media queries and responsive styles that adapt the layout for mobile, tablet, and desktop viewports.

**Validates: Requirements 5.1**

### Property 8: Mobile Column Stacking

_For any_ multi-column layout block, the generated HTML should include CSS that stacks columns vertically when viewed on mobile devices (viewport width < 600px).

**Validates: Requirements 5.3**

### Property 9: Minimum Touch Target Size

_For any_ button block in the design, the generated HTML should ensure the button has a minimum height of 44 pixels in mobile view to meet touch interaction standards.

**Validates: Requirements 5.6**

### Property 10: CSS Compatibility Validation

_For any_ custom CSS applied to a block, the compatibility checker should identify properties that are not supported by major email clients and provide warnings.

**Validates: Requirements 4.7**

### Property 11: Compatibility Issue Detection

_For any_ email HTML that uses advanced CSS features, the compatibility checker should detect potential rendering issues and list the affected email clients.

**Validates: Requirements 6.2**

### Property 12: Fallback Generation for Advanced Features

_For any_ email design using advanced CSS features (gradients, shadows, animations), the generated HTML should include fallback styles for email clients that don't support those features.

**Validates: Requirements 4.6, 6.6**

### Property 13: Inline CSS in Exported HTML

_For any_ email design, the exported HTML should have all CSS styles inlined directly in HTML elements rather than in style tags or external stylesheets.

**Validates: Requirements 10.2**

### Property 14: Merge Tag Replacement

_For any_ email containing merge tags and recipient data, sending the email should replace all merge tags with the corresponding recipient data values.

**Validates: Requirements 8.3**

### Property 15: Merge Tag Fallback Handling

_For any_ merge tag where recipient data is missing, the system should either use the specified fallback value or remove the tag entirely from the email content.

**Validates: Requirements 8.4**

### Property 16: Image Alt Text Requirement

_For any_ image block in an email design, attempting to save or send without alt text should trigger a validation warning or error.

**Validates: Requirements 12.1**

### Property 17: Color Contrast Validation

_For any_ text color and background color combination, the system should calculate the contrast ratio and warn if it doesn't meet WCAG AA standards (minimum 4.5:1 for normal text).

**Validates: Requirements 12.2**

### Property 18: Plain Text Generation

_For any_ HTML email design, the system should automatically generate a plain text version that contains all the text content without HTML tags.

**Validates: Requirements 12.4**

### Property 19: Unsubscribe Link Inclusion

_For any_ marketing email design, the generated HTML should include an unsubscribe link in the footer section.

**Validates: Requirements 12.5**

### Property 20: Template Export-Import Round Trip

_For any_ email template, exporting to JSON and then importing that JSON should produce an identical template structure.

**Validates: Requirements 10.1, 10.3**

### Property 21: HTML Size Warning

_For any_ email design, if the generated HTML exceeds 100 kilobytes, the system should display a warning about potential loading issues.

**Validates: Requirements 9.5**

### Property 22: HTML Optimization Reduces Size

_For any_ email design, the optimized HTML output should be smaller in size than the unoptimized version while maintaining the same visual appearance.

**Validates: Requirements 9.6**

### Property 23: Template Analytics Tracking

_For any_ email sent using a design template, the email communication record should include the template identifier for analytics tracking.

**Validates: Requirements 11.1**

### Property 24: Block Library Categorization

_For any_ block in the pre-built blocks library, it should be assigned to exactly one category, and all blocks in a category should share common characteristics.

**Validates: Requirements 7.1**

### Property 25: Responsive Image Scaling

_For any_ image block, the generated HTML should ensure the image width never exceeds its container width on any device size.

**Validates: Requirements 5.5**

## Error Handling

### User Input Validation

1. **Template Name Validation**

   - Empty names: Display error "Template name is required"
   - Duplicate names: Display warning "A template with this name already exists"
   - Invalid characters: Sanitize input automatically

2. **Image Upload Validation**

   - File size > 5MB: Display error "Image must be under 5MB"
   - Unsupported format: Display error "Please upload JPG, PNG, or GIF"
   - Upload failure: Retry with exponential backoff, show error after 3 attempts

3. **URL Validation**

   - Invalid URL format: Display error "Please enter a valid URL"
   - Missing protocol: Auto-prepend "https://"
   - Broken links: Optional link checker with warning

4. **Color Input Validation**
   - Invalid hex code: Display error "Please enter a valid hex color"
   - Poor contrast: Display warning with WCAG compliance info
   - Provide color picker as alternative input method

### System Error Handling

1. **Network Failures**

   - Save failures: Queue changes locally, retry when connection restored
   - Load failures: Display cached version with "offline" indicator
   - Send failures: Queue email for retry, notify user of delay

2. **Database Errors**

   - Constraint violations: Display user-friendly error messages
   - Connection timeouts: Implement retry logic with exponential backoff
   - Data corruption: Validate data integrity, restore from backup if needed

3. **Rendering Errors**

   - Invalid HTML: Sanitize and attempt to fix, display warning
   - WebView crashes: Fallback to simplified preview mode
   - Memory issues: Implement pagination for large designs

4. **Performance Degradation**
   - Slow rendering: Show loading indicators, implement progressive rendering
   - Large file sizes: Warn user, suggest optimization
   - Memory pressure: Reduce preview quality, unload unused resources

### Error Recovery Strategies

1. **Auto-Save Recovery**

   - Automatically save drafts every 30 seconds
   - Restore unsaved changes on app restart
   - Provide "Restore Previous Version" option

2. **Graceful Degradation**

   - If visual editor fails, fallback to HTML editor
   - If preview fails, show text-only preview
   - If drag-and-drop fails, provide button-based reordering

3. **User Notifications**
   - Non-blocking toasts for minor issues
   - Modal dialogs for critical errors requiring action
   - Persistent banners for ongoing issues (offline mode)

## Testing Strategy

### Unit Testing

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Test Focus Areas:**

- Individual block component rendering
- HTML generation for specific block types
- CSS inlining functionality
- Color contrast calculation
- Merge tag parsing and replacement
- Template validation logic
- Image optimization functions
- Accessibility checker functions

**Example Unit Tests:**

```typescript
describe('ButtonBlock', () => {
  it('should render with default styles', () => {
    const block = createButtonBlock({ text: 'Click Me' });
    const html = generateBlockHTML(block);
    expect(html).toContain('Click Me');
    expect(html).toContain('min-height: 44px'); // Touch target size
  });

  it('should include link URL in href attribute', () => {
    const block = createButtonBlock({
      text: 'Click Me',
      link: 'https://example.com',
    });
    const html = generateBlockHTML(block);
    expect(html).toContain('href="https://example.com"');
  });
});

describe('ColorContrastValidator', () => {
  it('should pass WCAG AA for sufficient contrast', () => {
    const result = validateContrast('#000000', '#FFFFFF');
    expect(result.passes).toBe(true);
    expect(result.ratio).toBeGreaterThan(4.5);
  });

  it('should fail WCAG AA for insufficient contrast', () => {
    const result = validateContrast('#777777', '#888888');
    expect(result.passes).toBe(false);
    expect(result.ratio).toBeLessThan(4.5);
  });
});
```

### Property-Based Testing

Property-based testing will be implemented using **fast-check** library for JavaScript/TypeScript. Each correctness property from the design document will be implemented as a property-based test.

**Property Test Configuration:**

- Minimum 100 iterations per property test
- Custom generators for email designs, blocks, and styles
- Shrinking enabled to find minimal failing cases

**Example Property Tests:**

```typescript
import fc from 'fast-check';

describe('Property 1: Template Round-Trip Consistency', () => {
  it('should preserve design structure through save/load cycle', () => {
    fc.assert(
      fc.property(emailDesignArbitrary(), async (design) => {
        // Save the design
        const saved = await saveEmailDesign(design);

        // Load the design
        const loaded = await loadEmailDesign(saved.id);

        // Compare structures (excluding timestamps and IDs)
        expect(normalizeDesign(loaded)).toEqual(normalizeDesign(design));
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: Responsive HTML Generation', () => {
  it('should generate HTML with media queries for all designs', () => {
    fc.assert(
      fc.property(emailDesignArbitrary(), (design) => {
        const html = generateHTML(design);

        // Check for media query presence
        expect(html).toMatch(/@media.*max-width.*600px/);

        // Check for responsive meta tag
        expect(html).toContain('viewport');
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 14: Merge Tag Replacement', () => {
  it('should replace all merge tags with recipient data', () => {
    fc.assert(
      fc.property(
        emailDesignWithMergeTagsArbitrary(),
        recipientDataArbitrary(),
        (design, recipientData) => {
          const html = generatePersonalizedHTML(design, recipientData);

          // No merge tags should remain in output
          expect(html).not.toMatch(/\{\{.*?\}\}/);

          // Recipient data should be present
          Object.values(recipientData).forEach((value) => {
            if (value) expect(html).toContain(value);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Custom Generators:**

```typescript
// Generator for email designs
const emailDesignArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    blocks: fc.array(emailBlockArbitrary(), { minLength: 1, maxLength: 20 }),
    theme: themeArbitrary(),
    settings: settingsArbitrary(),
  });

// Generator for email blocks
const emailBlockArbitrary = () =>
  fc.oneof(
    textBlockArbitrary(),
    imageBlockArbitrary(),
    buttonBlockArbitrary(),
    columnsBlockArbitrary()
  );

// Generator for text blocks
const textBlockArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('text'),
    content: fc.record({
      html: fc.string({ minLength: 1, maxLength: 500 }),
      plainText: fc.string({ minLength: 1, maxLength: 500 }),
    }),
    styles: blockStylesArbitrary(),
  });

// Generator for recipient data
const recipientDataArbitrary = () =>
  fc.record({
    firstName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    lastName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    email: fc.emailAddress(),
    company: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  });
```

### Integration Testing

**Test Scenarios:**

1. Complete email design workflow (create → edit → preview → send)
2. Template library operations (browse → select → customize → save)
3. Block manipulation (add → reorder → edit → delete)
4. Theme customization and propagation
5. Import/export functionality
6. Analytics tracking integration
7. SendGrid API integration

### Performance Testing

**Metrics to Monitor:**

- Editor initialization time (target: < 2 seconds)
- Block drag-and-drop responsiveness (target: 60 FPS)
- Preview update latency (target: < 100ms)
- HTML generation time (target: < 500ms)
- Memory usage during editing (target: < 200MB)
- App size increase (target: < 5MB)

**Performance Test Tools:**

- React Native Performance Monitor
- Flipper for debugging
- Custom performance logging

### Accessibility Testing

**Automated Checks:**

- Color contrast validation (WCAG AA)
- Alt text presence for images
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility

**Manual Testing:**

- Test with VoiceOver (iOS) and TalkBack (Android)
- Verify keyboard-only navigation
- Test with different font sizes
- Verify with color blindness simulators

### Email Client Testing

**Target Email Clients:**

- Gmail (web, iOS, Android)
- Outlook (desktop, web, mobile)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Outlook.com
- Mobile clients (iOS Mail, Android Gmail)

**Testing Approach:**

- Use Litmus or Email on Acid for automated testing
- Manual testing on physical devices
- Screenshot comparison for regression testing

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goals:**

- Set up basic visual editor structure
- Implement core block system
- Create HTML generation pipeline

**Deliverables:**

- Visual editor component with canvas
- Basic block types (text, image, button)
- HTML generator with inline CSS
- Database schema for email_designs table

### Phase 2: Template System (Weeks 3-4)

**Goals:**

- Build template library
- Implement template management
- Create pre-built templates

**Deliverables:**

- Template library component
- 10+ pre-built templates
- Template CRUD operations
- Template preview functionality

### Phase 3: Advanced Blocks (Weeks 5-6)

**Goals:**

- Implement complex block types
- Add drag-and-drop functionality
- Build block library

**Deliverables:**

- Columns, hero, social blocks
- Drag-and-drop reordering
- Block library component
- Custom block saving

### Phase 4: Styling & Theming (Week 7)

**Goals:**

- Implement theme system
- Add style customization
- Build properties panel

**Deliverables:**

- Theme editor
- Block properties panel
- Global style propagation
- Web-safe font selector

### Phase 5: Responsive Design (Week 8)

**Goals:**

- Implement responsive HTML generation
- Add device preview modes
- Ensure mobile optimization

**Deliverables:**

- Responsive HTML generator
- Device preview component
- Mobile-specific overrides
- Touch target validation

### Phase 6: Compatibility & Export (Week 9)

**Goals:**

- Build compatibility checker
- Implement import/export
- Add HTML optimization

**Deliverables:**

- Compatibility checker service
- JSON export/import
- HTML export with inline CSS
- MJML import support

### Phase 7: Personalization (Week 10)

**Goals:**

- Implement merge tags
- Add dynamic content
- Build personalization preview

**Deliverables:**

- Merge tag system
- Conditional content blocks
- Personalization preview
- Bulk send with personalization

### Phase 8: Analytics & Accessibility (Week 11)

**Goals:**

- Integrate analytics tracking
- Implement accessibility checks
- Add compliance features

**Deliverables:**

- Template analytics dashboard
- Accessibility validator
- Alt text enforcement
- Unsubscribe link automation

### Phase 9: Performance Optimization (Week 12)

**Goals:**

- Optimize rendering performance
- Reduce memory usage
- Improve load times

**Deliverables:**

- Lazy loading for images
- Progressive rendering
- Memory optimization
- Performance monitoring

### Phase 10: Testing & Polish (Weeks 13-14)

**Goals:**

- Complete test coverage
- Fix bugs and edge cases
- Polish UI/UX

**Deliverables:**

- Full test suite (unit + property tests)
- Bug fixes
- UI refinements
- Documentation

## Security Considerations

### Input Sanitization

1. **HTML Sanitization**

   - Strip dangerous tags (script, iframe, object)
   - Remove event handlers (onclick, onerror)
   - Validate URLs to prevent XSS
   - Use DOMPurify or similar library

2. **Image Upload Security**

   - Validate file types by content, not extension
   - Scan for malware
   - Limit file sizes
   - Store in secure cloud storage (Supabase Storage)

3. **URL Validation**
   - Prevent javascript: and data: URLs
   - Validate external link destinations
   - Implement CSP headers

### Data Privacy

1. **Template Sharing**

   - Implement proper access controls
   - Validate user permissions
   - Audit template access logs

2. **Recipient Data**

   - Encrypt merge tag data at rest
   - Implement RLS policies
   - Comply with GDPR/CCPA

3. **Analytics Data**
   - Anonymize recipient information
   - Implement data retention policies
   - Provide data export/deletion

### API Security

1. **SendGrid Integration**

   - Secure API key storage
   - Implement rate limiting
   - Validate webhook signatures

2. **Supabase Security**
   - Row Level Security policies
   - Service role key protection
   - Audit logging

## Monitoring and Observability

### Metrics to Track

1. **Usage Metrics**

   - Number of designs created
   - Template usage frequency
   - Block type popularity
   - Export/import frequency

2. **Performance Metrics**

   - Editor load time
   - HTML generation time
   - Preview render time
   - API response times

3. **Quality Metrics**

   - Email deliverability rate
   - Compatibility check failures
   - Accessibility violations
   - User error rates

4. **Business Metrics**
   - Template performance (open/click rates)
   - User engagement with design features
   - Conversion from basic to design mode
   - Feature adoption rates

### Logging Strategy

1. **Application Logs**

   - Error logs with stack traces
   - Performance logs for slow operations
   - User action logs for debugging
   - API call logs

2. **Analytics Events**

   - Design created/updated/deleted
   - Template selected/customized
   - Block added/removed/reordered
   - Email sent with design

3. **Error Tracking**
   - Use Sentry or similar service
   - Track error frequency and patterns
   - Monitor crash rates
   - Alert on critical errors

## Future Enhancements

### Potential Features

1. **AI-Powered Design Suggestions**

   - Analyze high-performing templates
   - Suggest layout improvements
   - Auto-generate designs from text prompts
   - Smart content recommendations

2. **Collaborative Editing**

   - Real-time multi-user editing
   - Comments and annotations
   - Version history and rollback
   - Team template libraries

3. **Advanced Animations**

   - CSS animations for supported clients
   - GIF support
   - Interactive elements (accordions, carousels)
   - Video embedding

4. **A/B Testing**

   - Create design variants
   - Automatic split testing
   - Performance comparison
   - Winner selection

5. **Design System Integration**

   - Import brand guidelines
   - Enforce design standards
   - Component libraries
   - Style tokens

6. **Advanced Personalization**
   - Dynamic product recommendations
   - Location-based content
   - Behavioral triggers
   - Countdown timers

## Conclusion

The Rich Email Design System represents a significant enhancement to NexaSuit's email capabilities, transforming it from a basic email client into a comprehensive email marketing and design platform. The modular architecture, focus on performance, and emphasis on email client compatibility ensure that users can create professional, responsive emails that render correctly across all major email clients.

The implementation strategy balances feature richness with mobile performance constraints, leveraging proven libraries while maintaining the React Native architecture. The comprehensive testing strategy, including property-based testing, ensures correctness and reliability across all use cases.

By following this design, NexaSuit will provide users with a powerful yet intuitive email design system that rivals desktop email marketing platforms while maintaining the convenience and accessibility of a mobile-first application.
