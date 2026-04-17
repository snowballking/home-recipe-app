-- Merge "meat" and "seafood" categories into "meat_seafood"
UPDATE public.recipes SET category = 'meat_seafood' WHERE category IN ('meat', 'seafood');
