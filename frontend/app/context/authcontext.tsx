"use client"

import React, { createContext, useEffect, useState } from 'react'
import Cookies from 'js-cookie';

const AuthContext = createContext({
  isAuthenticated: false,
  isLoading: true,
  setIsAuthenticated: (val : boolean) => {},
})

export const AuthProvider = ({ children } : {children : React.ReactNode}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('23id_user')
    console.log(token);
    setIsAuthenticated(Boolean(token))
    setIsLoading(false);
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext;
