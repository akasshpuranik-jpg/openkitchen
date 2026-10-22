-- 'error' = the check itself failed (API error, no credit, timeout, refusal, unreadable
-- reply). 'unclear' = Claude looked and judged the photo too dark/blurry or the wrong spot.
ALTER TABLE findings DROP CONSTRAINT findings_status_check;
ALTER TABLE findings ADD CONSTRAINT findings_status_check
  CHECK (status IN ('ok', 'issues', 'unclear', 'error'));

-- Rows saved before this split: a failed call was stored as unclear with spot_match NULL
-- and confidence 0. Relabel them so the page says "not checked" rather than "unclear".
UPDATE findings
SET status = 'error', note = 'Not checked yet — the automatic check couldn''t run'
WHERE status = 'unclear' AND spot_match IS NULL AND confidence = 0;

-- Genuine "unclear" verdicts keep their status; only the old ambiguous wording changes.
UPDATE findings
SET note = 'Unclear photo — too dark, blurry or hard to judge'
WHERE status = 'unclear' AND note = 'Unclear photo — couldn''t check';
