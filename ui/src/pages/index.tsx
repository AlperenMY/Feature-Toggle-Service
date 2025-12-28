import NextLink from "next/link";
import {
  Box,
  Container,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" gutterBottom>
          Toggle Admin UI
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Basic UI for the assignment.
        </Typography>
      </Box>

      <List sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        {[
          { href: "/login", label: "Login" },
          { href: "/register", label: "Register" },
          { href: "/dashboard", label: "Dashboard" },
        ].map((item) => (
          <ListItem key={item.href} disablePadding divider>
            <ListItemButton component={NextLink} href={item.href}>
              <ListItemText
                primary={
                  <Link component="span" underline="hover" color="inherit">
                    {item.label}
                  </Link>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Container>
  );
}
