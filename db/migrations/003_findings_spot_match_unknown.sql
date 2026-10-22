-- spot_match is NULL when the check couldn't run or its output didn't parse
-- (status is then 'unclear'), so we never record a guess as true/false.
ALTER TABLE findings ALTER COLUMN spot_match DROP NOT NULL;
