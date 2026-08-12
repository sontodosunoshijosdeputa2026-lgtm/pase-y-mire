(function () {
  'use strict';

  function getUser() {
    try {
      return JSON.parse(
        localStorage.getItem('user') || 'null'
      );
    } catch (error) {
      console.error('Error leyendo usuario:', error);
      return null;
    }
  }

  function updateUserName() {
    const user = getUser();

    document
      .querySelectorAll('[data-user-name], #userName')
      .forEach(element => {
        element.textContent =
          user?.name ||
          user?.username ||
          user?.email ||
          'Usuario';
      });
  }

  function handleLogout() {
    if (!window.confirm('¿Cerrar sesión?')) {
      return;
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    window.location.href = '/';
  }

  window.handleLogout = handleLogout;

  window.PyMNav = {
    updateUserName,
    handleLogout
  };

  document.addEventListener(
    'DOMContentLoaded',
    updateUserName
  );
})();
