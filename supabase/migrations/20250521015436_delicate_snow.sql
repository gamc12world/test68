/*
  # Add Resend API key

  1. Changes
    - Insert Resend API key into api_keys table
*/

INSERT INTO api_keys (name, value)
VALUES ('resend', 're_UR7UVzgu_Cr5xdXx4dq4DAoLFeV2jNvWn')
ON CONFLICT (name) 
DO UPDATE SET value = EXCLUDED.value;