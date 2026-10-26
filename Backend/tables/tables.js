const createDeptTableQuery = `
    CREATE TABLE IF NOT EXISTS depts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    );
`; 

const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role role_type,
        pass VARCHAR(80) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT dept 
            FOREIGN KEY (deptId) 
            REFERENCES depts(id)
    );
`; 

const createGrievanceTableQuery = `
    CREATE TABLE IF NOT EXISTS grievances (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description VARCHAR(300) NOT NULL,
        status status_type NOT NULL DEFAULT 'pending',
        priority priority_type, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hash VARCHAR(256) NOT NULL,
        evidence BOOLEAN DEFAULT FALSE,
        CONSTRAINT dept 
            FOREIGN KEY (deptId) 
            REFERENCES depts(id),
        CONSTRAINT user 
            FOREIGN KEY (userId) 
            REFERENCES users(id)
    );
`;


const createAuditTableQuery = `
    CREATE TABLE IF NOT EXISTS audit (
        id SERIAL PRIMARY KEY,
        comment VARCHAR(300),
        currentStatus status_type NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT grievance 
            FOREIGN KEY (grievanceId) 
            REFERENCES grievances(id)
            ON DELETE CASCADE
    );
`;