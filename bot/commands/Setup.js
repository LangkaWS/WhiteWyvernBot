const Database     = require('../queries/GlobalQueries.js');
const Tools        = require('../Tools.js');
const AdminQueries = require('../queries/AdminQueries.js');

const { Setup, AccessDenied, NotUnderstoodTxt } = require('../languages/fr.json');

/**
 * Call the suitable function according to arguments of the command.
 * @param {Message} message 
 */
function menu(message) {
    const [command] = Tools.getArgs(message);

    switch (command) {
    case 'admin':
        setupAdmin(message);
        break;

    case 'next':
    case 'add':
    case 'remove':
        break;
    
    case 'help':
    default:
        help(message);
    }
}

async function setupAdmin(message) {
    try {
        const adminRolesConfig = await Database.getAdminRoles(message.guild.id);
        const adminRoles = [];
        adminRolesConfig.forEach(role => adminRoles.push(role.role_id));

        let isNewAdminSetup = false;

        if (!adminRolesConfig.length) {
            isNewAdminSetup = true;

            let wantCreateAdminRoles =  await Tools.getReply(message, Setup.AskSetupAdminRole);
            while (wantCreateAdminRoles !== 'yes' && wantCreateAdminRoles !== 'no') {
                wantCreateAdminRoles = await Tools.getReply(message, NotUnderstoodTxt);
            }

            if (wantCreateAdminRoles === 'yes') {
                let reply;
                do {
                    const roleMention = await Tools.getReply(message, Setup.AskAdminRoleToAdd);
                    reply = await addRole(message, roleMention, adminRoles);
                } while (reply !== '!blanco next')
            }

            message.channel.send(Setup.AdminSetupEnd);
        }
        
        if (isAdmin(message.member, adminRoles)) {
            if (isNewAdminSetup === false) {

                let wantModifyAdminRoles =  await Tools.getReply(message, Setup.AskModifyAdminRoles);
                while (wantModifyAdminRoles !== 'yes' && wantModifyAdminRoles !== 'no') {
                    wantModifyAdminRoles = await Tools.getReply(message, NotUnderstoodTxt);
                }
    
                if (wantModifyAdminRoles === 'yes') {

                    message.channel.send(Setup.AdminRolesList);
                    let roleList = '';
                    adminRoles.forEach(roleId => {
                        let role = message.guild.roles.resolve(roleId);
                        roleList += '- ' + role.name + '\r';
                    });
                    message.channel.send(roleList);
    
                    message.channel.send(Setup.AskAdminRolesModification);
    
                    let modificationCommand = '';
    
                    do {
                        modificationCommand = await message.channel.awaitMessages(msg => msg.author.id === message.author.id, {max: 1});
                        const [command, role] = Tools.getArgs(modificationCommand.first());
                        if (command === 'add') {
                            await addRole(message, role, adminRoles);
                        } else if (command === 'remove') {
                            await removeRole(message, role, adminRoles);
                        } else if (command !== 'next') {
                            message.channel.send(NotUnderstoodTxt);
                        }
                    } while (modificationCommand.first().content !== '!blanco next')
                }

                message.channel.send(Setup.AdminSetupEnd);
            }
        } else {
            message.channel.send(AccessDenied);
            return;
        }
    } catch (err) {
        Tools.sendError(err, message.channel);
    }
}

async function addRole(message, roleMention, roles) {
    try{
        const roleId = roleMention.replace('<@&', '').replace('>', '');
        if (!roles.includes(roleId)) {
            if (isRole(message.guild, roleId)) {
                await AdminQueries.addAdminRole(message.guild.id, roleId);
                roles.push(roleId);
                message.channel.send(Setup.RoleSuccessfullyAdded);
            } else {
                message.channel.send(Setup.RoleNotFoundInGuild);
            }
        } else {
            message.channel.send(Setup.RoleAlreadyAdmin);
        }
        return roleId;
    } catch (err) {
        Tools.sendError(err, message.channel);
    }
}

async function removeRole(message, roleMention, roles) {
    try {
        const roleId = roleMention.replace('<@&', '').replace('>', '');
        if (roles.includes(roleId)) {
            if (isRole(message.guild, roleId)) {
                await AdminQueries.removeAdminRole(message.guild.id, roleId);
                roles.splice(roles.indexOf(roleId), 1);
                message.channel.send(Setup.RoleSuccessfullyRemoved);
            } else {
                message.channel.send(Setup.RoleNotFoundInGuild);
            }
        } else {
            message.channel.send(Setup.RoleIsNotAdmin);
        }
    } catch (err) {
        Tools.sendError(err, message.channel);
    }
}

function isAdmin(member, roles) {
    return member.roles.cache.some(role => roles.includes(role.id));
}

function isRole(guild, roleId) {
    return guild.roles.cache.some(r => r.id === roleId);
}

function help(message) {
    message.channel.send(Setup.Help);
}

module.exports = { menu }