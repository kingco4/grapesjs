import Component from '../../dom_components/model/Component';

export type AccessibilityIssueRule =
  | 'image-alt'
  | 'heading-order'
  | 'input-label'
  | 'link-name'
  | 'button-name'
  | 'iframe-title'
  | 'duplicate-id'
  | 'document-lang';

export interface AccessibilityIssue {
  rule: AccessibilityIssueRule;
  severity: 'warning';
  message: string;
  selector: string;
  tagName: string;
}

export interface AccessibilityReport {
  issues: AccessibilityIssue[];
  issueCount: number;
}

const inputTypesToIgnore = ['hidden', 'button', 'submit', 'reset', 'image'];

type ValidationContext = {
  doc: Document;
  html: string;
  issues: AccessibilityIssue[];
};

type ValidationRule = (ctx: ValidationContext) => void;

const buildSelector = (el: Element) => {
  const tagName = el.tagName.toLowerCase();
  const id = el.getAttribute('id');
  if (id) return `${tagName}#${id}`;

  const classList = Array.prototype.slice.call(el.classList, 0, 2) as string[];
  if (classList.length) return `${tagName}.${classList.join('.')}`;

  const parent = el.parentElement;
  if (!parent) return tagName;
  const siblings = Array.prototype.slice.call(parent.children).filter((child: Element) => child.tagName === el.tagName);
  const index = siblings.indexOf(el) + 1;
  return `${tagName}:nth-of-type(${index})`;
};

const createIssue = (el: Element, rule: AccessibilityIssueRule, message: string): AccessibilityIssue => ({
  rule,
  severity: 'warning',
  message,
  selector: buildSelector(el),
  tagName: el.tagName.toLowerCase(),
});

const hasAccessibleName = (el: Element) => {
  const labelledBy = el.getAttribute('aria-labelledby');
  const ariaLabel = el.getAttribute('aria-label');
  const title = el.getAttribute('title');
  const text = el.textContent?.trim();
  const imgAlt = el.querySelector('img')?.getAttribute('alt')?.trim();
  return !!labelledBy?.trim() || !!ariaLabel?.trim() || !!title?.trim() || !!text || !!imgAlt;
};

const hasAssociatedLabel = (el: Element, doc: Document) => {
  if (el.closest('label')) return true;
  const id = el.getAttribute('id');
  if (!id) return false;
  return Array.from(doc.querySelectorAll('label')).some((label) => label.getAttribute('for') === id);
};

const getComponentLabel = (component?: Component) => {
  if (!component) return 'generated content';
  return `${component.getName({ noCustom: true })} component`;
};

const validateImages: ValidationRule = ({ doc, issues }) => {
  doc.querySelectorAll('img').forEach((img) => {
    const role = img.getAttribute('role');
    const alt = img.getAttribute('alt');
    const decorative = role === 'presentation' || role === 'none';
    if (!decorative && alt === null && !hasAccessibleName(img)) {
      issues.push(createIssue(img, 'image-alt', 'Image is missing alt text or an accessible label.'));
    }
  });
};

const validateHeadingOrder: ValidationRule = ({ doc, issues }) => {
  let previousLevel = 0;
  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const level = Number(heading.tagName.slice(1));
    const isFirstHeading = previousLevel === 0;
    const skippedLevel = level > previousLevel + 1;

    if ((isFirstHeading && level > 1) || (!isFirstHeading && skippedLevel)) {
      issues.push(
        createIssue(
          heading,
          'heading-order',
          isFirstHeading
            ? `Heading starts at ${heading.tagName.toLowerCase()} instead of h1.`
            : `Heading level jumps from h${previousLevel} to ${heading.tagName.toLowerCase()}.`,
        ),
      );
    }

    previousLevel = level;
  });
};

const validateInputs: ValidationRule = ({ doc, issues }) => {
  doc.querySelectorAll('input, select, textarea').forEach((field) => {
    const tagName = field.tagName.toLowerCase();
    const type = (field.getAttribute('type') || '').toLowerCase();
    if (tagName === 'input' && inputTypesToIgnore.includes(type)) return;
    if (!hasAssociatedLabel(field, doc) && !hasAccessibleName(field)) {
      issues.push(createIssue(field, 'input-label', 'Form control is missing an associated label.'));
    }
  });
};

const validateLinks: ValidationRule = ({ doc, issues }) => {
  doc.querySelectorAll('a[href]').forEach((link) => {
    if (!hasAccessibleName(link)) {
      issues.push(createIssue(link, 'link-name', 'Link is missing an accessible name.'));
    }
  });
};

const validateButtons: ValidationRule = ({ doc, issues }) => {
  doc.querySelectorAll('button').forEach((button) => {
    if (!hasAccessibleName(button)) {
      issues.push(createIssue(button, 'button-name', 'Button is missing an accessible name.'));
    }
  });
};

const validateIframes: ValidationRule = ({ doc, issues }) => {
  doc.querySelectorAll('iframe').forEach((frame) => {
    if (!frame.getAttribute('title')?.trim() && !hasAccessibleName(frame)) {
      issues.push(createIssue(frame, 'iframe-title', 'Iframe is missing a title or accessible label.'));
    }
  });
};

const validateDuplicateIds: ValidationRule = ({ doc, issues }) => {
  const ids = new Map<string, Element[]>();
  doc.querySelectorAll('[id]').forEach((el) => {
    const id = el.getAttribute('id')!;
    ids.set(id, [...(ids.get(id) || []), el]);
  });

  ids.forEach((elements, id) => {
    if (elements.length < 2) return;
    elements.slice(1).forEach((el) => {
      issues.push(createIssue(el, 'duplicate-id', `Duplicate id "${id}" found in the document.`));
    });
  });
};

const validateDocumentLang: ValidationRule = ({ doc, html, issues }) => {
  if (!/<html[\s>]/i.test(html)) return;
  const htmlEl = doc.documentElement;
  if (!htmlEl.getAttribute('lang')?.trim()) {
    issues.push(createIssue(htmlEl, 'document-lang', 'Document root is missing a lang attribute.'));
  }
};

const validationRules: ValidationRule[] = [
  validateImages,
  validateHeadingOrder,
  validateInputs,
  validateLinks,
  validateButtons,
  validateIframes,
  validateDuplicateIds,
  validateDocumentLang,
];

export const validateAccessibilityHtml = (html: string): AccessibilityReport => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const issues: AccessibilityIssue[] = [];
  const ctx = { doc, html, issues };

  validationRules.forEach((rule) => rule(ctx));

  return {
    issues,
    issueCount: issues.length,
  };
};

export const getAccessibilityReportAnnouncement = (report: AccessibilityReport, component?: Component) => {
  const targetLabel = getComponentLabel(component);
  if (!report.issueCount) {
    return `Accessibility check completed for ${targetLabel}. No issues detected.`;
  }

  return `Accessibility check completed for ${targetLabel}. ${report.issueCount} warning${report.issueCount === 1 ? '' : 's'} detected.`;
};
