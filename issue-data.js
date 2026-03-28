// Generated from assets/issues. Re-run: node scripts/build-issue-data.js
// Each issue is built from its folder; page count = actual files only.

var ISSUE_DATA = {
  "idea-marinade": {
    "title": "idea marinade",
    "cover": "assets/issues/idea marinade/cover.jpeg",
    "pages": [
      { "type": "cover" },
      { "type": "image", "src": "assets/issues/idea marinade/page-1.jpeg", "label": "page 1" },
      { "type": "image", "src": "assets/issues/idea marinade/page-2.jpeg", "label": "page 2" },
      { "type": "image", "src": "assets/issues/idea marinade/page-3.jpeg", "label": "page 3" },
      { "type": "image", "src": "assets/issues/idea marinade/page-4.jpeg", "label": "page 4" }
    ]
  },
  "observations-as-an-introvert": {
    "title": "observations as an introvert",
    "cover": "assets/issues/observations as an introvert/cover.jpeg",
    "pages": [
      { "type": "cover" },
      { "type": "image", "src": "assets/issues/observations as an introvert/page-1.jpeg", "label": "page 1" },
      { "type": "image", "src": "assets/issues/observations as an introvert/page-2.jpeg", "label": "page 2" },
      { "type": "image", "src": "assets/issues/observations as an introvert/page-3.jpeg", "label": "page 3" },
      { "type": "image", "src": "assets/issues/observations as an introvert/page-4.jpeg", "label": "page 4" }
    ]
  },
  "romaticise-the-mundane": {
    "title": "romaticise the mundane",
    "cover": "assets/issues/romaticise the mundane/cover.png",
    "pages": [
      { "type": "cover" },
      { "type": "image", "src": "assets/issues/romaticise the mundane/page 1.jpeg", "label": "page 1" },
      { "type": "image", "src": "assets/issues/romaticise the mundane/page 2.jpeg", "label": "page 2" },
      { "type": "image", "src": "assets/issues/romaticise the mundane/page 3.jpeg", "label": "page 3" },
      { "type": "image", "src": "assets/issues/romaticise the mundane/page 4.jpeg", "label": "page 4" },
      { "type": "image", "src": "assets/issues/romaticise the mundane/page 5.jpeg", "label": "page 5" }
    ]
  },
  "self-perception": {
    "title": "self-perception",
    "cover": "assets/issues/self-perception/self-perception-cover page.png",
    "pages": [
      { "type": "cover" },
      { "type": "image", "src": "assets/issues/self-perception/page-1.jpeg", "label": "page 1" },
      { "type": "image", "src": "assets/issues/self-perception/page-2.jpeg", "label": "page 2" },
      { "type": "image", "src": "assets/issues/self-perception/page-3.jpeg", "label": "page 3" },
      { "type": "image", "src": "assets/issues/self-perception/page-4.jpeg", "label": "page 4" }
    ]
  },
  "stillherestilllife": {
    "title": "stillherestilllife",
    "cover": "assets/issues/stillherestilllife/cover.png",
    "pages": [
      { "type": "cover" },
      { "type": "image", "src": "assets/issues/stillherestilllife/page-1.jpg", "label": "page 1" },
      { "type": "image", "src": "assets/issues/stillherestilllife/page-2.jpg", "label": "page 2" },
      { "type": "image", "src": "assets/issues/stillherestilllife/page-3.jpg", "label": "page 3" },
      { "type": "image", "src": "assets/issues/stillherestilllife/page-5.png", "label": "page 5" }
    ]
  }
};

function getIssueBySlug(slug) {
  return ISSUE_DATA[slug] || null;
}
