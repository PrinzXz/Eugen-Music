const { glob } = require('glob');
const path = require('path');

module.exports = async (client) => {
    client.logger.info('Loading Commands...');
    
    const commandFiles = await glob(`${process.cwd()}/src/commands/**/*.js`.replace(/\\/g, '/'));
    let count = 0;
    
    commandFiles.forEach(file => {
        const command = require(path.resolve(file));
        
        if (command.name) {
            // Extract the directory name as the category
            command.category = path.basename(path.dirname(file));
            
            client.commands.set(command.name, command);
            count++;
            
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => client.aliases.set(alias, command.name));
            }
        } else {
            client.logger.warn(`Command failed to load: ${file} (Missing name property)`);
        }
    });

    client.logger.info(`Successfully loaded ${count} Commands.`);
};
