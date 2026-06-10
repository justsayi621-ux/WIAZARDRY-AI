import { useLocation } from "wouter";

export function useNavigate() {
  const [, setLocation] = useLocation();
  return (path: string) => setLocation(path);
}
