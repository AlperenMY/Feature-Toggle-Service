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

export default function Login() {
  const r = useRouter();
  const [tenant, setTenant] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const resp = await api<{
        ok: boolean;
        tenant: { slug: string; name: string };
      }>("/auth/login", {
        method: "POST",
        data: { tenant, password },
      });
      localStorage.setItem("tenant", resp.tenant.slug);
      r.push("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Login failed");
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tenant Login
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Authenticate as a tenant and manage feature toggles.
        </Typography>
      </Box>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Tenant"
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="e.g. zebra"
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            fullWidth
          />

          {err ? <Alert severity="error">{err}</Alert> : null}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" type="submit">
              Login
            </Button>
            <Button variant="outlined" type="button" onClick={() => r.push("/register")}>
              Register
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
}
