import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Eye, EyeOff } from 'lucide-react';

// Custom Google Icon Component
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Store the return URL when component mounts
  useEffect(() => {
    const returnTo = searchParams.get('returnTo');
    const productId = searchParams.get('productId');
    const returnPage = searchParams.get('returnPage');
    
    // If there are specific return parameters, construct the return URL
    if (returnTo && productId && returnPage) {
      const separator = returnPage.includes('?') ? '&' : '?';
      const returnUrl = `${returnPage}${separator}openProduct=${productId}`;
      localStorage.setItem('authReturnUrl', returnUrl);
    } else {
      // Store the referrer or current page as return URL
      const referrer = document.referrer;
      const returnUrl = referrer && referrer !== window.location.href ? referrer : '/';
      localStorage.setItem('authReturnUrl', returnUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        
        // Check for return URL parameters
        const returnUrl = localStorage.getItem('authReturnUrl');
        if (returnUrl) {
          try {
            const url = new URL(returnUrl);
            const pathWithSearch = url.pathname + url.search + url.hash;
            navigate(pathWithSearch);
          } catch {
            // If URL parsing fails, treat as relative path
            navigate(returnUrl);
          }
          localStorage.removeItem('authReturnUrl');
        } else {
          navigate('/');
        }
      } else {
        await signUp(email, password, {
          first_name: firstName,
          last_name: lastName,
        });
        
        // Handle return URL for registration as well
        const returnUrl = localStorage.getItem('authReturnUrl');
        if (returnUrl) {
          try {
            const url = new URL(returnUrl);
            const pathWithSearch = url.pathname + url.search + url.hash;
            navigate(pathWithSearch);
          } catch {
            navigate(returnUrl);
          }
          localStorage.removeItem('authReturnUrl');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      const returnUrl = localStorage.getItem('authReturnUrl');
      if (returnUrl) {
        try {
          const url = new URL(returnUrl);
          const pathWithSearch = url.pathname + url.search + url.hash;
          navigate(pathWithSearch);
        } catch {
          navigate(returnUrl);
        }
        localStorage.removeItem('authReturnUrl');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">{isLogin ? 'Login to your account' : 'Create a new account'}</CardTitle>
              <CardDescription className="text-slate-400">
                {isLogin 
                  ? 'Enter your email below to login to your account'
                  : 'Fill in your details to create a new account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {!isLogin && (
                  <>
                    <div className="grid gap-3">
                      <Label htmlFor="first-name" className="text-slate-300">First Name</Label>
                      <Input
                        id="first-name"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="last-name" className="text-slate-300">Last Name</Label>
                      <Input
                        id="last-name"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}
                <div className="grid gap-3">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    {isLogin && (
                      <a
                        href="#"
                        className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-400 text-center">{error}</div>
                )}

                <div className="flex flex-col gap-3">
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-5 w-5 mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {isLogin ? 'Signing in...' : 'Signing up...'}
                      </div>
                    ) : (
                      isLogin ? 'Sign in' : 'Sign up'
                    )}
                  </Button>
                  {isLogin && (
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={handleGoogleSignIn}
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center justify-center"
                    >
                      <GoogleIcon className="h-5 w-5 mr-2" />
                      Sign in with Google
                    </Button>
                  )}
                </div>

                <div className="text-center text-sm text-slate-400">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth; 