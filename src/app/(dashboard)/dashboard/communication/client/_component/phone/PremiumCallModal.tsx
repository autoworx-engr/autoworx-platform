import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Fade,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { X as Close, Crown } from "lucide-react";
import React from "react";

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  featureName?: string;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  open,
  onClose,
  featureName = "this feature",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // const handleUpgrade = () => {
  //   onClose();
  // };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          background: "linear-gradient(135deg, #667eea 0%, #006D77 100%)",
          position: "relative",
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.1)",
          zIndex: 0,
        }}
      />

      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          color: "white",
          zIndex: 2,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.2)",
          },
        }}
      >
        <Close size={20} />
      </IconButton>

      <DialogContent
        sx={{
          textAlign: "center",
          py: 6,
          px: 4,
          position: "relative",
          zIndex: 1,
          color: "white",
        }}
      >
        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
              border: "2px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <Crown size={40} color="#FFD700" />
          </Box>
        </Box>

        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            mb: 2,
            background: "linear-gradient(45deg, #FFD700, #FFA500)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "1.5rem", sm: "2rem" },
          }}
        >
          Upgrade to Premium
        </Typography>

        <Typography
          variant="h6"
          sx={{
            mb: 4,
            color: "rgba(255, 255, 255, 0.9)",
            fontWeight: 400,
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          You need to go premium to unlock {featureName}
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          p: 4,
          pt: 0,
          position: "relative",
          zIndex: 1,
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* <Button
          onClick={handleUpgrade}
          variant="contained"
          size="large"
          fullWidth
          endIcon={<ArrowRight size={20} />}
          sx={{
            py: 1.5,
            fontSize: "1.1rem",
            fontWeight: "bold",
            background: "linear-gradient(45deg, #FFD700, #FFA500)",
            color: "#1a1a1a",
            borderRadius: 2,
            textTransform: "none",
            boxShadow: "0 8px 32px rgba(255, 215, 0, 0.3)",
            "&:hover": {
              background: "linear-gradient(45deg, #FFA500, #FF8C00)",
              transform: "translateY(-2px)",
              boxShadow: "0 12px 40px rgba(255, 215, 0, 0.4)",
            },
            transition: "all 0.3s ease",
          }}
        >
          Upgrade to Premium
        </Button> */}

        <Button
          onClick={onClose}
          variant="text"
          size="large"
          fullWidth
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            textTransform: "none",
            "&:hover": {
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          Maybe later
        </Button>
      </DialogActions>
    </Dialog>
  );
};
