# coding: utf8
from marmiton import Marmiton
import argparse
import sys
import json

parser = argparse.ArgumentParser(description='Handle TeamCook node server requests')

# Add the arguments
parser.add_argument('-l', '--list', type=str, help='List recipes containg specific keywords')
parser.add_argument('-d', '--details', type=str, help='Get recipe data from specific url')

# Execute the parse_args() method
args = vars(parser.parse_args())

# print(args["details"] is None)

if args["details"] is not None:
  print(json.dumps(Marmiton.get(args["details"])))
else:
  # Search :
  query_options = {
    "aqt": args["list"],      # Query keywords - separated by a white space
    #"dt": "platprincipal",      # Plate type : "entree", "platprincipal", "accompagnement", "amusegueule", "sauce" (optional)
    #"exp": 2,                   # Plate price : 1 -> Cheap, 2 -> Medium, 3 -> Kind of expensive (optional)
    #"dif": 2,                   # Recipe difficulty : 1 -> Very easy, 2 -> Easy, 3 -> Medium, 4 -> Advanced (optional)
    #"veg": 0,                   # Vegetarien only : 0 -> False, 1 -> True (optional)
  }
  print(json.dumps(Marmiton.search(query_options)))

sys.stdout.flush()

# print(query_result) # get list, then we need to get details

# Get :
# recipe = query_result[0]
# main_recipe_url = recipe['url']

# detailed_recipe = Marmiton.get(main_recipe_url)  # Get the details of the first returned recipe (most relevant in our case)

# print(detailed_recipe) # get details

# Display result :
# print("## %s\n" % detailed_recipe['name'])  # Name of the recipe
# print("Recette par '%s'" % (detailed_recipe['author']))
# print("Noté %s/5 par %s personnes." % (detailed_recipe['rate'], detailed_recipe['nb_comments']))
# print("Temps de cuisson : %s / Temps de préparation : %s / Temps total : %s." % (detailed_recipe['cook_time'] if detailed_recipe['cook_time'] else 'N/A',detailed_recipe['prep_time'], detailed_recipe['total_time']))
# print("Tags : %s" % (", ".join(detailed_recipe['tags'])))
# print("Difficulté : '%s'" % detailed_recipe['difficulty'])
# print("Budget : '%s'" % detailed_recipe['budget'])

# print("\nRecette pour %s personne(s) :\n" % detailed_recipe['people_quantity'])
# for ingredient in detailed_recipe['ingredients']:  # List of ingredients
#     print("- %s" % ingredient)

# print("")

# for step in detailed_recipe['steps']:  # List of cooking steps
#     print("# %s" % step)

# if detailed_recipe['author_tip']:
# 	print("\nNote de l'auteur :\n%s" % detailed_recipe['author_tip'])