import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat,
  Header, Footer, PageNumber, PageBreak } from "/usr/local/lib/node_modules_global/lib/node_modules/docx/dist/index.mjs";
import fs from "fs";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Helper: status cell with colour
function statusCell(text, fill) {
  return new TableCell({
    borders,
    width: { size: 1800, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text, bold: true, size: 20, font: "Arial", color: "FFFFFF" }),
    ] })],
  });
}

function textCell(text, width, bold = false) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children: [new Paragraph({ children: [
      new TextRun({ text, size: 20, font: "Arial", bold }),
    ] })],
  });
}

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1F3864", type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [
      new TextRun({ text, bold: true, size: 20, font: "Arial", color: "FFFFFF" }),
    ] })],
  });
}

function checklistRow(item, desc, status, statusColor) {
  return new TableRow({
    children: [
      textCell(item, 2800, true),
      textCell(desc, 4760),
      statusCell(status, statusColor),
    ],
  });
}

const GREEN = "2E7D32";
const AMBER = "F57F17";
const RED = "C62828";
const GREY = "757575";

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({ children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "CONFIDENTIAL \u2014 Legal Risk Checklist", size: 16, font: "Arial", color: "999999", italics: true })],
          }),
        ] }),
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 16, font: "Arial", color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "999999" }),
            ],
          }),
        ] }),
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Home Recipe App", size: 40, bold: true, font: "Arial", color: "1F3864" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: "Legal Risk Checklist for Recipe Import Feature", size: 28, font: "Arial", color: "2E75B6" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "Prepared: April 2026  |  Status: Working Draft  |  Review with legal counsel before launch", size: 18, font: "Arial", color: "888888" })],
        }),

        // ─── Section 1: What's Already Implemented ────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Safeguards Already Built Into the App")] }),

        new Paragraph({ spacing: { after: 200 }, children: [
          new TextRun({ text: "These protections have been coded into the recipe import feature:", size: 22 }),
        ] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 4760, 1800],
          rows: [
            new TableRow({ children: [
              headerCell("Safeguard", 2800),
              headerCell("How It Works", 4760),
              headerCell("Status", 1800),
            ] }),
            checklistRow(
              "AI Rephrasing",
              "AI prompts explicitly instruct Haiku/Gemini to rewrite cooking steps in their own words, never copy verbatim. Only factual ingredient lists are extracted as-is (these are not copyrightable).",
              "DONE", GREEN
            ),
            checklistRow(
              "Private by Default",
              "All imported recipes are automatically set to Private visibility. Users must manually toggle to Public.",
              "DONE", GREEN
            ),
            checklistRow(
              "Public Sharing Warning",
              "When a user toggles an imported recipe to Public, a prominent amber warning reminds them to add personal adaptations before sharing.",
              "DONE", GREEN
            ),
            checklistRow(
              "Source Attribution",
              "Every imported recipe displays a prominent blue attribution box on the recipe detail page with a direct link back to the original source.",
              "DONE", GREEN
            ),
            checklistRow(
              "Import Disclaimer",
              "Users must check a disclaimer checkbox before importing, acknowledging personal use and their responsibility for any public sharing.",
              "DONE", GREEN
            ),
            checklistRow(
              "robots.txt Compliance",
              "Before scraping any website (fallback path), the app checks the site's robots.txt and refuses to scrape if disallowed.",
              "DONE", GREEN
            ),
            checklistRow(
              "No Screenshot Storage",
              "For RedNote/Instagram, the uploaded screenshot is sent to AI for extraction only. The image is never persisted on the server\u2014only the extracted text data is stored.",
              "DONE", GREEN
            ),
            checklistRow(
              "Generic Titles",
              "The AI is instructed to use the common dish name rather than copying creative or trademarked recipe titles.",
              "DONE", GREEN
            ),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── Section 2: Checklist of Items Still To Do ────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Actions Still Required Before Launch")] }),

        new Paragraph({ spacing: { after: 200 }, children: [
          new TextRun({ text: "Complete these items to further reduce legal exposure. Items marked CRITICAL should be addressed before public launch.", size: 22 }),
        ] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 4760, 1800],
          rows: [
            new TableRow({ children: [
              headerCell("Action Item", 2800),
              headerCell("Details", 4760),
              headerCell("Priority", 1800),
            ] }),
            checklistRow(
              "Terms of Service",
              "Draft ToS that explicitly states: (a) users are responsible for ensuring they have the right to share imported recipes publicly, (b) the app provides tools for personal recipe management, (c) Anthropic/Google AI are used for content processing. Have a lawyer review.",
              "CRITICAL", RED
            ),
            checklistRow(
              "DMCA Takedown Process",
              "Set up a simple DMCA takedown process: a dedicated email (e.g. copyright@homerecipe.app), a published DMCA policy page, and an internal workflow to remove content within 48 hours of a valid request. This provides safe harbour protection.",
              "CRITICAL", RED
            ),
            checklistRow(
              "Privacy Policy",
              "Create a privacy policy covering: what data is collected, how AI APIs process user content, that screenshots are not stored, and how source URLs are used. Required by both Anthropic and Google API terms.",
              "CRITICAL", RED
            ),
            checklistRow(
              "Cookie/Consent Banner",
              "If operating in regions covered by GDPR or similar laws, implement a cookie consent banner. Even for MVP, a basic one is low effort and high value.",
              "HIGH", AMBER
            ),
            checklistRow(
              "Rate Limiting",
              "Add rate limiting to the /api/extract-recipe endpoint to prevent abuse (mass scraping through your app). Recommended: 20 imports per user per day.",
              "HIGH", AMBER
            ),
            checklistRow(
              "YouTube ToS Review",
              "YouTube's Terms of Service restrict automated access. The transcript extraction may technically violate this. Consider using the official YouTube Data API (requires an API key) for a more compliant approach, or accept the risk for personal-use features.",
              "HIGH", AMBER
            ),
            checklistRow(
              "Content Moderation",
              "Before allowing public recipes, consider basic moderation: flag recipes imported from copyrighted cookbooks (detectable by source URL patterns), or implement community reporting for potentially infringing content.",
              "MEDIUM", AMBER
            ),
            checklistRow(
              "Signup Agreement",
              "During user registration, have users agree to your Terms of Service and confirm they will respect original creators' rights when sharing content.",
              "MEDIUM", AMBER
            ),
            checklistRow(
              "AI API Compliance",
              "Review Anthropic's and Google's API usage policies. Ensure your use case (recipe extraction from user-provided URLs/screenshots) complies with their acceptable use policies. Both have terms about content processing.",
              "MEDIUM", AMBER
            ),
            checklistRow(
              "Legal Counsel Review",
              "Before public launch, have a lawyer (ideally one familiar with IP/copyright in tech) review your import feature, ToS, and DMCA process. Budget approximately $1,000\u2013$3,000 for a small startup legal review.",
              "CRITICAL", RED
            ),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ─── Section 3: Risk Assessment ────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Risk Assessment by Source Type")] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1800, 2520, 2520, 2520],
          rows: [
            new TableRow({ children: [
              headerCell("Source", 1800),
              headerCell("What's Protected", 2520),
              headerCell("What's Safe to Extract", 2520),
              headerCell("Risk Level", 2520),
            ] }),
            new TableRow({ children: [
              textCell("Recipe Websites", 1800, true),
              textCell("Creative writing (blog post, story around recipe), photographs, unique recipe names, exact step wording", 2520),
              textCell("Ingredient list (factual), cooking techniques (general knowledge), nutritional facts", 2520),
              textCell("LOW \u2014 with AI rephrasing + attribution", 2520),
            ] }),
            new TableRow({ children: [
              textCell("YouTube Videos", 1800, true),
              textCell("Video content, exact transcript wording, thumbnails. YouTube ToS restricts automated access.", 2520),
              textCell("Recipe facts from transcript (ingredients, techniques). Rephrased steps.", 2520),
              textCell("MEDIUM \u2014 ToS concern for transcript access", 2520),
            ] }),
            new TableRow({ children: [
              textCell("RedNote", 1800, true),
              textCell("Photos, creative captions, original recipe presentations, visual layout", 2520),
              textCell("Recipe facts visible in screenshot. AI extracts text data only; image is not stored.", 2520),
              textCell("LOW-MEDIUM \u2014 screenshot is transient", 2520),
            ] }),
            new TableRow({ children: [
              textCell("Instagram", 1800, true),
              textCell("Photos, captions, Stories content. Instagram ToS restricts scraping.", 2520),
              textCell("Recipe facts visible in screenshot. Same transient processing as RedNote.", 2520),
              textCell("LOW-MEDIUM \u2014 screenshot is transient", 2520),
            ] }),
          ],
        }),

        new Paragraph({ spacing: { before: 300, after: 200 }, children: [] }),

        // ─── Section 4: Key Legal Principles ────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Key Legal Principles to Understand")] }),

        new Paragraph({ spacing: { after: 160 }, children: [
          new TextRun({ text: "Recipes and copyright: ", bold: true, size: 22 }),
          new TextRun({ text: "A bare list of ingredients is generally not copyrightable (it is considered a statement of fact). The creative expression around a recipe \u2014 the specific wording of instructions, personal anecdotes, photographs, and unique descriptions \u2014 is what receives copyright protection. This is well-established in US case law.", size: 22 }),
        ] }),
        new Paragraph({ spacing: { after: 160 }, children: [
          new TextRun({ text: "Fair use considerations: ", bold: true, size: 22 }),
          new TextRun({ text: "Transformative use (extracting factual data and rephrasing in new words for a different purpose) weighs in favour of fair use. Your app transforms content by: (a) extracting only factual recipe data, (b) rephrasing instructions via AI, (c) serving a different purpose (personal recipe management vs. original publication). However, fair use is determined case-by-case and is not guaranteed.", size: 22 }),
        ] }),
        new Paragraph({ spacing: { after: 160 }, children: [
          new TextRun({ text: "DMCA safe harbour: ", bold: true, size: 22 }),
          new TextRun({ text: "If your platform qualifies as a service provider under the DMCA (Section 512), having a proper takedown process provides legal protection against user-uploaded content that infringes copyright. This is why setting up the DMCA process is critical.", size: 22 }),
        ] }),
        new Paragraph({ spacing: { after: 160 }, children: [
          new TextRun({ text: "Platform ToS compliance: ", bold: true, size: 22 }),
          new TextRun({ text: "YouTube, Instagram, and RedNote each have Terms of Service that may restrict automated access. Violating ToS is generally a contractual matter (not criminal), but could result in IP blocks or cease-and-desist letters. The screenshot approach for RedNote/Instagram is lower risk since the user performs the capture manually.", size: 22 }),
        ] }),
        new Paragraph({ spacing: { after: 160 }, children: [
          new TextRun({ text: "Important disclaimer: ", bold: true, size: 22, color: "C62828" }),
          new TextRun({ text: "This document is not legal advice. The information above reflects general principles and common industry practices. Consult a qualified intellectual property attorney before launching your product commercially.", size: 22, color: "C62828" }),
        ] }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
const outPath = process.argv[2] || "/sessions/laughing-dazzling-babbage/mnt/Home Recipe, Calories & Grocery Shopping List/Legal_Risk_Checklist.docx";
fs.writeFileSync(outPath, buffer);
console.log("Created:", outPath);
