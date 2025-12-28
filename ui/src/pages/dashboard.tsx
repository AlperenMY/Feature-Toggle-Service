import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../lib/api";

type FeatureItem = {
  featureKey: string;
  featureName: string;
  enabled: boolean;
  strategyType: "boolean" | "percentage" | "targeting";
  strategyConfig: any;
  version: number;
  updatedAt: string;
  evaluated?: boolean;
};

export default function Dashboard() {
  const [tenant, setTenant] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("tenant") || "";
    if (t) setTenant(t);
    // If no tenant saved (likely not logged in), go to login
    if (!t) {
      window.location.href = "/login";
    }
  }, []);

  const [env, setEnv] = useState<"dev" | "staging" | "prod">("dev");
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [edit, setEdit] = useState<FeatureItem | null>(null);

  async function load() {
    setErr(null);
    try {
      const out = await api<{ items: FeatureItem[] }>(
        `/features?tenant=${encodeURIComponent(
          tenant
        )}&env=${env}&page=1&pageSize=50`
      );
      setItems(out.items);
    } catch (e: any) {
      if (!handleAuthError(e)) setErr(e.message);
    }
  }

  async function save() {
    if (!edit) return;
    setErr(null);
    try {
      await api(`/features`, {
        method: "POST",
        data: {
          tenant,
          env,
          featureKey: edit.featureKey,
          featureName: edit.featureName,
          enabled: edit.enabled,
          strategyType: edit.strategyType,
          strategyConfig: edit.strategyConfig,
        },
      });
      setEdit(null);
      setIsCreating(false);
      await load();
    } catch (e: any) {
      if (!handleAuthError(e)) setErr(e.message);
    }
  }

  async function remove(featureKey: string) {
    setErr(null);
    try {
      await api(`/features`, {
        method: "DELETE",
        data: { tenant, env, featureKey },
      });
      await load();
    } catch (e: any) {
      if (!handleAuthError(e)) setErr(e.message);
    }
  }

  function handleAuthError(e: any) {
    const msg = e?.message ?? "";
    if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
      window.location.href = "/login";
      return true;
    }
    return false;
  }

  async function promote(fromEnv: string, toEnv: string) {
    setErr(null);
    try {
      await api(`/features/promote`, {
        method: "POST",
        data: {
          tenant,
          fromEnv,
          toEnv,
          dryRun: false,
          conflictPolicy: "fail",
        },
      });
      await load();
    } catch (e: any) {
      if (!handleAuthError(e)) setErr(e.message);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Feature Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage feature flags per tenant and environment.
        </Typography>
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="flex-end"
        sx={{ mb: 2 }}
      >
        <TextField
          label="Tenant"
          value={tenant}
          InputProps={{ readOnly: true }}
          sx={{ minWidth: 180 }}
        />
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel id="env-label">Env</InputLabel>
          <Select
            labelId="env-label"
            label="Env"
            value={env}
            onChange={(e) => setEnv(e.target.value as any)}
          >
            <MenuItem value="dev">dev</MenuItem>
            <MenuItem value="staging">staging</MenuItem>
            <MenuItem value="prod">prod</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={load}>
          Refresh
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setIsCreating(true);
            setEdit({
              featureKey: "",
              featureName: "",
              enabled: true,
              strategyType: "boolean",
              strategyConfig: {},
              version: 0,
              updatedAt: "",
            });
          }}
        >
          New Flag
        </Button>
        <Button
          variant="outlined"
          onClick={() => promote(env, env === "dev" ? "staging" : "prod")}
          disabled={env === "prod"}
        >
          Promote {env} to {env === "dev" ? "staging" : "prod"}
        </Button>
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Enabled</TableCell>
              <TableCell>Strategy</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.featureKey}>
                <TableCell>{it.featureKey}</TableCell>
                <TableCell>{it.featureName}</TableCell>
                <TableCell>{String(it.enabled)}</TableCell>
                <TableCell>{it.strategyType}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={() => setEdit(it)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => remove(it.featureKey)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!items.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  align="center"
                  sx={{ color: "text.secondary" }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      No features found
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setIsCreating(true);
                        setEdit({
                          featureKey: "",
                          featureName: "",
                          enabled: true,
                          strategyType: "boolean",
                          strategyConfig: {},
                          version: 0,
                          updatedAt: "",
                        });
                      }}
                    >
                      Create first flag
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {edit && (
        <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {isCreating ? "Create Feature Flag" : "Edit Feature"}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Key"
              value={edit.featureKey}
              onChange={(e) => setEdit({ ...edit, featureKey: e.target.value })}
              fullWidth
            />
            <TextField
              label="Name"
              value={edit.featureName}
              onChange={(e) =>
                setEdit({ ...edit, featureName: e.target.value })
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="enabled-label">Enabled</InputLabel>
              <Select
                labelId="enabled-label"
                label="Enabled"
                value={String(edit.enabled)}
                onChange={(e) =>
                  setEdit({ ...edit, enabled: e.target.value === "true" })
                }
              >
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="strategy-label">Strategy</InputLabel>
              <Select
                labelId="strategy-label"
                label="Strategy"
                value={edit.strategyType}
                onChange={(e) =>
                  setEdit({ ...edit, strategyType: e.target.value as any })
                }
              >
                <MenuItem value="boolean">boolean</MenuItem>
                <MenuItem value="percentage">percentage</MenuItem>
                <MenuItem value="targeting">targeting</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Strategy Config (JSON)"
              value={JSON.stringify(edit.strategyConfig ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  const obj = JSON.parse(e.target.value);
                  setEdit({ ...edit, strategyConfig: obj });
                } catch {
                  // ignore parse errors while typing
                }
              }}
              multiline
              minRows={6}
              fullWidth
              sx={{
                gridColumn: "1 / -1",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ gridColumn: "1 / -1" }}
            >
              percentage: {`{ "rolloutPercentage": 25 }`} — targeting:{" "}
              {`{ "allow": ["u1"], "deny": ["u2"] }`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={save}>
              Save
            </Button>
            <Button variant="outlined" onClick={() => setEdit(null)}>
              Cancel
            </Button>
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
