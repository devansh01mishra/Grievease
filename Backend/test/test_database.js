import { checkPassword } from "../utils/crypto";

const users = [
    {
        name: "test_1",
        email: "test_1_email@email.com",
        id: "test_1_id",
        role: "test_role_a",
        password: "test_password_123"
    },
    {
        name: "test_2",
        email: "test_2_email@email.com",
        id: "test_2_id",
        role: "test_role_b",
        password: "test_password_456"
    },
    {
        name: "test_3",
        email: "test_3_email@email.com",
        id: "test_3_id",
        role: "test_role_c",
        password: "test_password_789"
    }
]

const depts = [
    {
        name: "CSED",
        id: "test_id",
        users: [
            {
                name: "test_1",
                email: "test_1_email@email.com",
                role: "role_a",
                password: "test_password_123"
            },
            {
                name: "test_2",
                email: "test_2_email@email.com",
                role: "role_b",
                password: "test_password_456"
            },
            {
                name: "test_3",
                email: "test_3_email@email.com",
                role: "role_c",
                password: "test_password_789"
            }
        ]
    }
]

const admin = {
    name: "admin_name",
    email: "admin_email",
    password: "admin_password"
}

export async function getUsers() {
    return await Promise.all(users.map(user => JSON.stringify(user)));
}

export async function getUser(name, email) {
    return users.find(user => user.name == name && user.email == email);
}

export async function getDept(deptName) {
    return depts.find(dept => dept.name == deptName);
}

export async function getDeptUser(dept, name, email) {
    return dept.users.find(user => user.name == name && user.email == email);
}

export async function getAdmin(name, email, password) {
    if(name != admin.name || email != admin.email) return null;
    if(!(await checkPassword(password, admin.password))) return null;
    return admin;
}