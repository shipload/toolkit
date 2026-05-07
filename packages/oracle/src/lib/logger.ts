import {createLogger, format, transports} from 'winston'

export const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.prettyPrint()),
    transports: [
        new transports.Console(),
        new transports.File({
            filename: 'shared/error.log',
            level: 'error',
            maxsize: 5_242_880,
            maxFiles: 5,
            tailable: true,
        }),
    ],
})
