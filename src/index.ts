#!/usr/bin/env ts-node
/**
 * ***** Terminology the below code is as follows - I tried to keep it consistent *****
 * shipment - A reference to a line in the shipment file which is a single entry that is an address; this may also be referred to as a "street" or "address"
 * driver - A reference to a line in the driver's file which refers to a single entry in said file
 * vowel - This is initially determined to be a list of characters that is defaulted to "aAeEiIoOuU"
 * consonant - Any character that is NOT a vowel
 * suitability/suitability score - A calculation based on a set of rules documented below - used for sorting asoociations between shipments and drivers
 * commonalities - A list of factors used to determine how alike two values are
 *
 * The output is a list of shipment to driver associations to view the raw values before assigning shipments to drivers - primarily useful for verifying the logic is working as intended
 * The second part of the output says "Assigning shipments to drivers" which attempts to assign shipments to drivers based off of a suitability score - When a suitability is determined of equal highest value
 * the first entry in the list is chosen and removed from available shipments
 *
 * The code is not perfect as there are some edge cases (documented below) as having more shipments than drivers, duplicate values, special characters in entries, etc.
 */

import { readFileSync } from 'fs'
import { resolve, join } from 'path'
import { inspect } from 'util'
import chalk from 'chalk'

const args = process.argv.slice(2)
const data_directory = resolve(join(__dirname, '..', 'data'))
const shipments_file_path = `${data_directory}/${args[0]}`
const drivers_file_path = `${data_directory}/${args[1]}`

/**
 * @description fetch and retrieve a text file located in the local file system
 * @param {string} path Path of the resource to fetch
 * @returns {string[]} List of strings seperated by newline characters
 * @example 
    const shipments = get_data_file(shipments_file_path)
    const drivers = get_data_file(drivers_file_path)
 */
const get_data_file = (path: string) => {
    try {
        return readFileSync(path).toString().split('\n')
    } catch (error) {
        console.error(chalk.redBright(error))
        process.exit(1)
    }
}

/**
 * @description Given a street name and a driver's name, calculate the suitability between the driver and the street
 *  Rule1: If the length of the shipment's destination street name is even, the base suitability score (SS) is the number of vowels in the driver’s name multiplied by 1.5.
 *  Rule2: If the length of the shipment's destination street name is odd, the base SS is the number of consonants in the driver’s name multiplied by 1.
 *  Rule3: If the length of the shipment's destination street name shares any common factors (besides 1) with the length of the driver’s name, the SS is increased by 50% above the base SS.
 * @param {string} destination_street_name Street address of shipment
 * @param {string} driver_name The driver's name
 * @returns {number} The suitability score determined by the "secret" algorithm specified in the above rules
 */
const get_suitability_score = (destination_street_name: string, driver_name: string): number => {
    let suitability_score = 0
    const destination_street_name_is_even = !(destination_street_name.length % 2)
    const driver_vowel_count = get_vowel_count(driver_name)
    const driver_consonant_count = get_consonant_count(driver_name)

    if (destination_street_name_is_even) {
        suitability_score += driver_vowel_count * 1.5 // Rule 1
    } else {
        suitability_score += driver_consonant_count * 1 // Rule 2
    }

    if (get_commonalities(destination_street_name, driver_name).length > 1) {
        suitability_score += suitability_score * 0.5 // Rule 3
    }
    return suitability_score
}

/**
 * @description Given a string, calculate the number of vowels contained therein
 * @param {string} arg haystack
 * @param {string} vowels Optional/Default needle to search haystack
 * @returns {number} Number of vowels contained within haystack
 */
const get_vowel_count = (arg: string, vowels: string = 'aAeEiIoOuU'): number => {
    let count = 0
    for (let i = 0; i < arg.length; i++) {
        if (vowels.indexOf(arg[i]) !== -1) count++
    }
    return count
}

/**
 * @description Given a string, calculate the number of consonants contained therein;
 *  This method determines consonants by first getting the number of vowels and then subtracting the number of vowels from total length of string to get consonants
 *  A limitation of this method is that it only removes spaces and ignores everything else - including special characters
 * @param {string} arg haystack
 * @returns {number} Number of consonants within haystack
 * @
 */
const get_consonant_count = (arg: string): number => {
    const vowel_count = get_vowel_count(arg)
    return arg.replace(' ', '').length - vowel_count
}

/**
 * @description Given two strings, determine commonalities between them; Commonalities are limited to: length, vowels, consonants
 * @param arg1 comparator 1
 * @param arg2 comparator 2
 * @returns {string|null[]} List of comparators which are common between args
 */
const get_commonalities = (arg1: string, arg2: string) => {
    return [
        arg1.length == arg2.length ? 'length' : null,
        get_vowel_count(arg1) === get_vowel_count(arg2) ? 'vowels' : null,
        get_consonant_count(arg1) === get_consonant_count(arg2) ? 'consonants' : null,
    ].filter((commonality) => commonality)
}

/**
 * @description A utility method to view the details of the association between drivers to shipments - This is more used as a quick method to verify individual driver to shipments details
 */
const get_driver_suitabilities = (driver_name: string, shipments: string[]) => {
    return {
        driver: {
            name: driver_name,
            length: driver_name.length,
            vowels: get_vowel_count(driver_name),
            consonants: get_consonant_count(driver_name),
        },
        shipments: shipments
            .map((shipment) => {
                return {
                    name: shipment,
                    length: shipment.length,
                    driver_vowel_count: get_vowel_count(driver_name),
                    driver_consonant_count: get_consonant_count(driver_name),
                    driver_commonalities: get_commonalities(driver_name, shipment),
                    suitability_score: get_suitability_score(shipment, driver_name),
                }
            })
            .sort((x, y) => (x.suitability_score < y.suitability_score ? 1 : x.suitability_score > y.suitability_score ? -1 : 0)),
    }
}

/**
 * @description A utility method to view the details of the association between shipments to drivers
 */
const get_shipment_suitabilities = (shipment: string, drivers: string[]) => {
    return {
        shipment: {
            name: shipment,
        },
        drivers: drivers
            .map((driver) => {
                return {
                    name: driver,
                    length: driver.length,
                    vowel_count: get_vowel_count(driver),
                    consonant_count: get_consonant_count(driver),
                    commonalities: get_commonalities(driver, shipment),
                    suitability_score: get_suitability_score(shipment, driver),
                }
            })
            .sort((x, y) => (x.suitability_score < y.suitability_score ? 1 : x.suitability_score > y.suitability_score ? -1 : 0)),
    }
}

/**
 * The main application loop
 */
const start = () => {
    const shipments = get_data_file(shipments_file_path)
    const drivers = get_data_file(drivers_file_path)

    // We get our copy of the original list we will be adjusting - the filter method is in case somebody hits return creating an empty entry into our list
    let available_shipments = [...shipments].filter((shipment) => shipment)
    let available_drivers = [...drivers].filter((driver) => driver)

    // The output should be the total SS and a matching between shipment destinations and drivers
    for (let i = 0; i < shipments.length; i++) {
        console.log(inspect(get_shipment_suitabilities(shipments[i], available_drivers), { depth: null, colors: true }))
    }

    /**
     * Assigning shipments to drivers -> for all routes, we calculate who is the best match for the shipment and then we remove both the driver and the shipment from what is available
     * Since both shipments and drivers are variable length, we could have the possibility that we end up with shipments with no driver and vice versa - which will display as empty during output
     */
    console.log(chalk.bgYellowBright.bold.cyanBright('\n***** Assigning shipments to drivers *****'))
    while (available_shipments.length >= 1 && available_drivers.length >= 1) {
        const shipment = available_shipments[0]
        const suitabilities = get_shipment_suitabilities(shipment, available_drivers)
        console.log(chalk.blueBright(shipment), ' -> ', chalk.greenBright(suitabilities.drivers[0].name), ' -> ', chalk.yellowBright(suitabilities.drivers[0].suitability_score))
        available_drivers = available_drivers.filter((driver) => driver !== suitabilities.drivers[0].name)
        available_shipments = available_shipments.filter((shipment) => shipment !== suitabilities.shipment.name)
    }
}

start()
