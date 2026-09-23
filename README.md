# reddit-activity-analysis

A data story built from ten years of my Reddit votes: what I was into, how rarely I posted compared with how often I upvoted, and how much of my voting moved into subreddits I follow.

**Live site:** https://kennedyjohnson.github.io/reddit-activity-analysis/ (a static page in `docs/`, no build step)

## Privacy

Only aggregates are published: shares and counts by category and year. No username, subreddit names, post or comment text, links, IPs or messages. The raw export, the subreddit-to-category labels and everything derived per item live in `data/`, which is gitignored. `build_site_data.py` fails if the output contains any string other than category names, or the account name or email from the export.

## Pipeline

```bash
pip install pandas

# 1. Parse the export (reddit.com/settings/data-request) into slim tables in data/
python scripts/parse_export.py "path/to/export_folder"

# 2. Label subreddits by category (hand labels in data/sub_labels.txt)
python scripts/classify.py

# 3. Aggregate into docs/data.js
python scripts/build_site_data.py "path/to/export_folder"

# Preview
python -m http.server -d docs 8000
```

## Methods

- **Dating votes:** the export lists votes and saves without dates. Reddit IDs are sequential base-36 numbers, so each voted item's creation date is interpolated between my own posts and comments, which have exact timestamps. This dates the content, not the vote. Items outside that range (under 1%) are left out of yearly charts.
- **Categories:** subreddits with 20 or more of my votes and saves are hand-labelled into 16 categories, covering 96% of items. Embedding subreddit names was tried first, but names are too short and cryptic (it put a phone subreddit under dating). Dating, health and adult subreddits (0.3%) are withheld.
- **Subscriptions:** the export only lists current subscriptions, so the subscribed share is low in early years for subreddits I've since left.
