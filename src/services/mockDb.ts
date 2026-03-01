// Simulated Database using LocalStorage

export interface User {
  id: number;
  name: string;
  rif: string;
  email: string;
  username: string;
  password?: string;
  role: 'CLIENT' | 'ADMIN';
  closed_periods?: {
    compras: string[];
    ventas: string[];
  };
}

export interface Invoice {
  id: number;
  user_id: number;
  date: string;
  invoice_number: string;
  control_number: string;
  exempt_amount: number;
  taxable_base: number;
  vat: number;
  total: number;
  file_data?: string;
  file_name?: string;
  file_type?: string;
  created_at: string;
  type?: 'COMPRA' | 'VENTA';
}

class MockDatabase {
  private get<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading ${key} from localStorage`, error);
      return [];
    }
  }

  private set(key: string, data: any[]) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage`, error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('El almacenamiento local está lleno. Por favor, libere espacio o elimine facturas antiguas con archivos adjuntos grandes.');
      }
    }
  }

  init() {
    const users = this.get<User>('users');
    
    // Ensure default admin exists
    const adminExists = users.some(u => u.username === 'admin');
    if (!adminExists) {
      const adminUser: User = {
        id: 1,
        name: 'Administrador',
        rif: 'J-00000000-0',
        email: 'admin@edumar.com',
        username: 'admin',
        password: 'admin123', // In a real app, this would be hashed
        role: 'ADMIN'
      };
      
      // If users array is empty, just set it. Otherwise, append the admin.
      if (users.length === 0) {
        this.set('users', [adminUser]);
      } else {
        // Ensure admin has ID 1, or just a unique ID
        adminUser.id = Math.max(...users.map(u => u.id), 0) + 1;
        this.set('users', [...users, adminUser]);
      }
    }
    
    if (!localStorage.getItem('invoices')) {
      this.set('invoices', []);
    }
  }

  // Users
  getUsers(): User[] {
    return this.get<User>('users');
  }

  getUserById(id: number): User | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.getUsers().find(u => u.username === username);
  }

  addUser(user: Omit<User, 'id'>): User {
    const users = this.getUsers();
    
    // Check duplicates
    if (users.some(u => u.username === user.username)) {
      throw new Error('El nombre de usuario ya está en uso');
    }
    if (users.some(u => u.email === user.email)) {
      throw new Error('El correo electrónico ya está registrado');
    }
    if (users.some(u => u.rif === user.rif)) {
      throw new Error('El RIF ya está registrado');
    }

    const newUser = {
      ...user,
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1
    };
    
    users.push(newUser);
    this.set('users', users);
    return newUser;
  }

  updateUser(id: number, data: Partial<User>): User {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error('Usuario no encontrado');
    }
    users[index] = { ...users[index], ...data };
    this.set('users', users);
    return users[index];
  }

  closePeriod(userId: number, type: 'COMPRA' | 'VENTA', period: string) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('Usuario no encontrado');

    const closed_periods = user.closed_periods || { compras: [], ventas: [] };
    const key = type === 'COMPRA' ? 'compras' : 'ventas';
    
    if (!closed_periods[key].includes(period)) {
      closed_periods[key].push(period);
      this.updateUser(userId, { closed_periods });
    }
  }

  isPeriodClosed(userId: number, type: 'COMPRA' | 'VENTA', period: string): boolean {
    const user = this.getUserById(userId);
    if (!user || !user.closed_periods) return false;
    const key = type === 'COMPRA' ? 'compras' : 'ventas';
    return user.closed_periods[key].includes(period);
  }

  createDemoData() {
    const users = this.getUsers();
    if (!users.some(u => u.username === 'demo')) {
      const demoUser = this.addUser({
        name: 'Empresa Demo C.A.',
        rif: 'J-12345678-9',
        email: 'demo@edumar.com',
        username: 'demo',
        password: 'demo',
        role: 'CLIENT',
        closed_periods: { compras: ['2026-01'], ventas: [] }
      });

      // Add some demo invoices
      const demoInvoices: Omit<Invoice, 'id' | 'created_at'>[] = [
        {
          user_id: demoUser.id,
          date: '2026-01-15',
          invoice_number: '001-0001',
          control_number: '00-0001',
          exempt_amount: 0,
          taxable_base: 1000,
          vat: 160,
          total: 1160,
          type: 'COMPRA'
        },
        {
          user_id: demoUser.id,
          date: '2026-02-10',
          invoice_number: '001-0002',
          control_number: '00-0002',
          exempt_amount: 50,
          taxable_base: 2000,
          vat: 320,
          total: 2370,
          type: 'COMPRA'
        },
        {
          user_id: demoUser.id,
          date: '2026-02-15',
          invoice_number: 'V-0001',
          control_number: '00-0001',
          exempt_amount: 0,
          taxable_base: 5000,
          vat: 800,
          total: 5800,
          type: 'VENTA'
        }
      ];

      demoInvoices.forEach(inv => this.addInvoice(inv));
    }
  }

  // Invoices
  getInvoices(userId?: number): Invoice[] {
    const invoices = this.get<Invoice>('invoices');
    if (userId) {
      return invoices.filter(i => i.user_id === userId);
    }
    return invoices;
  }

  addInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Invoice {
    const invoices = this.get<Invoice>('invoices');
    
    // Check duplicates
    if (invoices.some(i => i.user_id === invoice.user_id && i.invoice_number === invoice.invoice_number && i.control_number === invoice.control_number)) {
      throw new Error('Factura duplicada detectada');
    }

    const newInvoice = {
      ...invoice,
      id: invoices.length > 0 ? Math.max(...invoices.map(i => i.id)) + 1 : 1,
      created_at: new Date().toISOString(),
      type: invoice.type || 'COMPRA'
    };
    
    invoices.push(newInvoice);
    this.set('invoices', invoices);
    return newInvoice;
  }

  updateInvoice(id: number, userId: number, data: Partial<Invoice>): Invoice {
    const invoices = this.get<Invoice>('invoices');
    const index = invoices.findIndex(i => i.id === id && i.user_id === userId);
    
    if (index === -1) {
      throw new Error('Factura no encontrada o no autorizada');
    }

    invoices[index] = { ...invoices[index], ...data };
    this.set('invoices', invoices);
    return invoices[index];
  }

  deleteInvoice(id: number, userId: number) {
    let invoices = this.get<Invoice>('invoices');
    const initialLength = invoices.length;
    invoices = invoices.filter(i => !(i.id === id && i.user_id === userId));
    
    if (invoices.length === initialLength) {
      throw new Error('Factura no encontrada o no autorizada');
    }
    
    this.set('invoices', invoices);
  }
}

export const mockDb = new MockDatabase();
