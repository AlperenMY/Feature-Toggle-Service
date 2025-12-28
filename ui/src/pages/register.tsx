import { useState } from "react";
import { api } from "../lib/api";
import { useRouter } from "next/router";
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export default function Register() {
  const r = useRouter();
  const [tenant, setTenant] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);
    try {
      await api("/auth/register", {
        method: "POST",
        data: { tenant, name: name || undefined, password },
      });
      setOkMsg("Tenant created. You can login now.");
      setTimeout(() => r.push("/login"), 600);
    } catch (e: any) {
      setErr(e?.message ?? "Register failed");
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tenant Register
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create a tenant identity to manage feature toggles.
        </Typography>
      </Box>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Tenant slug"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="e.g. zebra"
            fullWidth
          />
          <TextField
            label="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zebra"
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min 8 chars"
            fullWidth
          />

          {err ? <Alert severity="error">{err}</Alert> : null}
          {okMsg ? <Alert severity="success">{okMsg}</Alert> : null}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" type="submit">
              Register
            </Button>
            <Button variant="outlined" type="button" onClick={() => r.push("/login")}>
              Back to Login
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
}
