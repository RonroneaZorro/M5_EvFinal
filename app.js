

// Clase para representar un Usuario
class User {
    constructor(id, name, email, password) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password; 
    }

    toJSON() {
        return { id: this.id, name: this.name, email: this.email, password: this.password }; // Solo se guardara en esta ocasión
    }

    static fromJSON(json) {
        const user = new User(json.id, json.name, json.email, json.password); // Solo se guardara en esta ocasión 
        return user;
    }
}

// Clase para representar una Tarea 
class Task {
    constructor(id, title, description, assignedTo, completed = false, createdAt = new Date()) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.assignedTo = assignedTo; // ID del usuario asignado
        this.completed = completed;
        this.createdAt = createdAt;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            assignedTo: this.assignedTo,
            completed: this.completed,
            createdAt: this.createdAt.toISOString()
        };
    }

    static fromJSON(json) {
        const task = new Task(
            json.id,
            json.title,
            json.description || '',
            json.assignedTo || null,
            json.completed || false,
            new Date(json.createdAt)
        );
        return task;
    }

    toggleCompleted() {
        this.completed = !this.completed;
    }
}

// Clase principal para gestionar la app
class TaskManager {
    constructor() {
        this.users = this.loadUsers();
        this.tasks = this.loadTasks();
        const savedUserId = localStorage.getItem('currentUserId');
        this.currentUser  = this.users.find(u => u.id === savedUserId) || null;
        this.initEventListeners();
        this.loadInitialTasks(); // Carga asíncrona de tareas iniciales
    }

    // Persistencia con localStorage
    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users.map(u => u.toJSON())));
    }

    loadUsers() {
        const data = localStorage.getItem('users');
        if (!data) return [];
        return JSON.parse(data).map(User.fromJSON);
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks.map(t => t.toJSON())));
    }

    loadTasks() {
        const data = localStorage.getItem('tasks');
        if (!data) return [];
        return JSON.parse(data).map(Task.fromJSON);
    }

    // Autenticación simulada
    registerUser (name, email, password) {
    const existingUser = this.users.find(u => u.email === email);

    if (existingUser) {
        console.log(`El usuario ya existe:`, existingUser); // Solo para realizar varias pruebas con diferentes usuarios
        throw new Error('Usuario ya existe');
    }
        const id = Date.now().toString();
        const user = new User(id, name, email, password);
        this.users.push(user);
        this.saveUsers();
        return user;
    }

    loginUser (email, password) {
        const user = this.users.find(u => u.email === email && u.password === password);
        if (!user) {
            throw new Error('Credenciales inválidas');
        }
        this.currentUser  = user;
        localStorage.setItem('currentUserId', user.id)
        return user;
    }

    logout() {
        this.currentUser  = null;
        localStorage.removeItem('currentUserId');
        this.renderAuthSection();
    }

    // Gestión de Tareas
    addTask(title, description, assignedToId) {
        const id = Date.now().toString();
        const task = new Task(id, title, description, assignedToId);
        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.renderStats();
    }

    updateTask(id, title, description, assignedToId) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.title = title;
            task.description = description;
            task.assignedTo = assignedToId;
            this.saveTasks();
            this.renderTasks();
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.renderStats();
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.toggleCompleted();
            this.saveTasks();
            this.renderTasks();
            this.renderStats();
        }
    }

    // Carga asíncrona de tareas iniciales
    async loadInitialTasks() {
        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
            if (!response.ok) throw new Error('Error en API');
            const apiTasks = await response.json();

            // Adaptar datos de API a nuestro modelo (simulación)
            apiTasks.forEach((apiTask, index) => {
                if (index < this.users.length) { // Asignar a usuarios existentes si hay
                    const task = new Task(
                        `api-${apiTask.id}`,
                        apiTask.title,
                        `Tarea simulada de API: ${apiTask.id}`,
                        this.users[index % this.users.length].id,
                        apiTask.completed
                    );
                    if (!this.tasks.find(t => t.id === task.id)) {
                        this.tasks.push(task);
                    }
                }
            });
            this.saveTasks();
            this.renderTasks();
            this.renderStats();
        } catch (error) {
            console.error('Error cargando tareas iniciales:', error);
            this.addSampleTasks();
        }
    }

    addSampleTasks() {
        if (this.users.length > 0) {
            this.addTask('Tarea de Ejemplo 1', 'Descripción ejemplo', this.users[0].id);
        }
    }

    // Renderizado DOM 
    renderAuthSection() {
        const authSection = document.getElementById('auth-section');
        const mainSection = document.getElementById('main-section');

        if (!this.currentUser ) {
            authSection.innerHTML = `
                <h2>Registro/Login</h2>
                <form id="auth-form">
                    <input type="text" id="name" placeholder="Nombre" required autocomplete="name">
                    <input type="email" id="email" placeholder="Email" required autocomplete="email">
                    <input type="password" id="password" placeholder="Contraseña" required autocomplete="new-password">
                    <button type="submit">Registrar</button>
                    <button type="button" id="login-btn">Login</button>
                </form>
                <p id="auth-error" style="color: red;"></p>
            `;
            mainSection.style.display = 'none';
            authSection.style.display = 'block';

            // Eventos para auth
            document.getElementById('auth-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
            document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        } else {
            authSection.innerHTML = `<p>Bienvenido, ${this.currentUser .name}! <button id="logout-btn">Logout</button></p>`;
            mainSection.style.display = 'block';
            authSection.style.display = 'block';
            document.getElementById('logout-btn').addEventListener('click', () => this.logout());
            this.renderTasks();
            this.renderStats();
        }
    }

    handleRegister() {
        try {
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            this.registerUser (name, email, password);
            this.loginUser (email, password); // Auto-login después de registrarse
            name.value = email.value = password.value = '';
            this.renderAuthSection();
        } catch (error) {
            document.getElementById('auth-error').textContent = error.message;
        }
    }

    handleLogin() {
        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            this.loginUser (email, password);
            this.renderAuthSection();
        } catch (error) {
            document.getElementById('auth-error').textContent = error.message;
        }
    }

    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        tasksList.innerHTML = '<h2>Tareas</h2>';
        this.tasks.forEach(task => {
            const user = this.users.find(u => u.id === task.assignedTo);
            const taskDiv = document.createElement('div');
            taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskDiv.innerHTML = `
                <div>
                    <h3>${task.title}</h3>
                    <p>${task.description}</p>
                    <p>Asignada a: ${user ? user.name : 'No asignada'}</p>
                    <small>Creada: ${task.createdAt.toLocaleDateString()}</small>
                </div>
                <div>
                    <button onclick="taskManager.toggleTask('${task.id}')">
                        ${task.completed ? 'Desmarcar' : 'Completar'}
                    </button>
                    <button onclick="taskManager.editTask('${task.id}')">Editar</button>
                    <button onclick="taskManager.deleteTask('${task.id}')">Eliminar</button>
                </div>
            `;
            tasksList.appendChild(taskDiv);
        });
    }

    renderStats() {
        const statsDiv = document.getElementById('stats');
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const percentage = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
        statsDiv.innerHTML = `
            <div class="stats">
                <h3>Estadísticas</h3>
                <p>Total de tareas: ${total}</p>
                <p>Completadas: ${completed}</p>
                <p>Avance: ${percentage}%</p>
            </div>
        `;
    }

    // Formulario para agregar/editar tarea
    showTaskForm(editId = null) {
        const formDiv = document.getElementById('task-form');
        const isEdit = editId !== null;
        const task = isEdit ? this.tasks.find(t => t.id === editId) : null;
        const usersOptions = this.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

        formDiv.innerHTML = `
            <h2>${isEdit ? 'Editar' : 'Agregar'} Tarea</h2>
            <form id="task-form-submit">
                <input type="text" id="title" placeholder="Título" value="${task ? task.title : ''}" required>
                <textarea id="description" placeholder="Descripción">${task ? task.description : ''}</textarea>
                <select id="assignedTo">
                    <option value="">Seleccionar usuario</option>
                    ${usersOptions}
                </select>
                <button type="submit">${isEdit ? 'Actualizar' : 'Agregar'}</button>
                <button type="button" id="cancel-btn">Cancelar</button>
            </form>
        `;
        formDiv.style.display = 'block';

        document.getElementById('task-form-submit').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const assignedToId = document.getElementById('assignedTo').value || null;
            if (isEdit) {
                this.updateTask(editId, title, description, assignedToId);
            } else {
                this.addTask(title, description, assignedToId);
            }
            formDiv.style.display = 'none';
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
            formDiv.style.display = 'none';
        });
    }

    editTask(id) {
        this.showTaskForm(id);
    }

    // Inicialización de eventos 
    initEventListeners() {
        document.getElementById('add-task-btn').addEventListener('click', () => this.showTaskForm());
        window.taskManager = this;
    }
}

// Inicialización de la app
document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    taskManager.renderAuthSection();

    // Si hay un usuario logueado previamente
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId && taskManager.users.find(u => u.id === savedUserId)) {
        taskManager.currentUser  = taskManager.users.find(u => u.id === savedUserId);
        localStorage.setItem('currentUserId', taskManager.currentUser .id);
        taskManager.renderAuthSection();
    }
});