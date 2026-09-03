-- Harden demo merchant passwords to the complex password policy.
-- (Plaintext credentials are not stored in the repo; set them via your local seed process.)

update merchant_users
set password_hash = '08f30874829977310dff85c5ddbc76ed:160820b00d9af1ef5781a87719650c83e96b957c16ca3edd49f12bc5bed0773beb51cb3d71474aea6a2c1fa5abbc0c9238dd7986bf888b9a219a0cf87edb7e07'
where email in ('owner@demo-cafe.com', 'staff@demo-cafe.com');

notify pgrst, 'reload schema';
