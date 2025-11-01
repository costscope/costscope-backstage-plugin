import { createTheme } from '@mui/material/styles';

// Central high-contrast theme used in Storybook and tests
// Dark background with bright primaries and explicit text colors
export const highContrastTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#FFD700' }, // vivid gold on dark
    secondary: { main: '#00E5FF' }, // bright cyan
    background: {
      default: '#000000',
      paper: '#0A0A0A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
    },
  },
});
