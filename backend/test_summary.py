
import re

def _clean_summary(summary: str) -> str:
    """Filter unwanted content from summary."""
    # Remove [cid:...] image references
    summary = re.sub(r'\[cid:[^\]]+\]', '', summary)
    # Remove multi-language notices
    summary = re.sub(r'(?i)\(?\s*please scroll down for the english version\s*\)?', '', summary)
    # Remove extra whitespace
    summary = ' '.join(summary.split())
    return summary.strip()

test_cases = [
    ("This is a summary. [cid:image001.jpg@01D8.123] And more text.", "This is a summary. And more text."),
    ("Summary here. (Please scroll down for the English version)", "Summary here."),
    ("  Extra   spaces  ", "Extra spaces"),
    ("Mixed [cid:123] and please scroll down for the English version content.", "Mixed and content.")
]

for input_str, expected in test_cases:
    result = _clean_summary(input_str)
    print(f"Input: {input_str}")
    print(f"Result: {result}")
    print(f"Expected: {expected}")
    print(f"Match: {result == expected}")
    print("-" * 20)

print("Date Formatting Test:")
try:
    from datetime import datetime
    d = datetime(2026, 2, 8)
    print(f"EN: {d.strftime('%B %Y')}") # Python doesn't have same locale support as JS toLocaleDateString without locale setup
    # checking logic correctness only
except Exception as e:
    print(e)
