// src/components/auth/OAuthButtonGroup.jsx
import React from 'react';
import { Button } from 'react-bootstrap';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../../contexts/AuthContext';

import { FaGithub, FaFacebookF } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function OAuthButtonGroup() {
  const navigate = useNavigate();

  const saveToLocal = (email, name, avatar) => {
    const newAcc = { email, name, avatar };
    const oldAccs = JSON.parse(localStorage.getItem('savedAccounts')) || [];
    if (!oldAccs.find(a => a.email === email)) {
      localStorage.setItem('savedAccounts', JSON.stringify([newAcc, ...oldAccs]));
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const token = credentialResponse.credential;
    const decoded = jwtDecode(token);

    try {
      const res = await fetch('http://localhost:8000/api/auth/google-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }) // ✅ sửa ở đây
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed');

      localStorage.setItem("token", data.token);
      saveToLocal(data.email, data.name || decoded.name, data.avatar || decoded.picture);
      navigate('/boards');
      window.location.reload();
      
    } catch (err) {
      alert(err.message);
    }
  };


  const handleGitHubLogin = () => {
    alert('GitHub OAuth chưa tích hợp – bạn cần đăng ký app GitHub và thêm backend handler.');
  };

  const handleFacebookLogin = () => {
    alert('Facebook OAuth chưa tích hợp – bạn cần đăng ký app Facebook và thêm backend handler.');
  };

  return (
    <div className="d-grid gap-2 mb-3">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => alert('Google Login Failed')}
      />
      <Button variant="outline-dark" onClick={handleGitHubLogin}>
        <FaGithub className="me-2" /> Continue with GitHub
      </Button>
      <Button variant="outline-primary" onClick={handleFacebookLogin}>
        <FaFacebookF className="me-2" /> Continue with Facebook
      </Button>
    </div>
  );
}
