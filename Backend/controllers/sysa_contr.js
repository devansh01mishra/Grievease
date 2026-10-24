export async function sysUserController(res, users, operation, operationName) {
    if (users.length == 0) {
        return res.status(301).json({
            success: false,
            message: 'No user data provided'
        });
    } else {
        Promise.all(users.map(async user => await operation(user))).then((user, id, len) => {
            if (!user.status) {
                return res.status(301).json({
                    success: false,
                    message: `Failed to ${operationName} user with name: ${user.name}; role: ${user.role}; email: ${user.email}`
                });
            } else if (id == len - 1) {
                return res.status(200).json({
                    success: true,
                    message: `${operationName} executed successfully for all users provided!`
                });
            }
        });
    }
}