from allrecipes import AllRecipes
import argparse
import sys
import json

parser = argparse.ArgumentParser(description='Handle TeamCook node server requests')

# Add the arguments
parser.add_argument('-l', '--list', type=str, help='List recipes containg specific keywords')
parser.add_argument('-d', '--details', type=str, help='Get recipe data from specific url')

# Execute the parse_args() method
args = vars(parser.parse_args())

if args["details"] is not None:
  print(json.dumps(AllRecipes.get(args["details"])))
elif args["list"] is not None:
  # Search :
  query_options = {
    "wt": args["list"],         # Query keywords
    #"ingIncl": "olives",        # 'Must be included' ingrdients (optional)
    #"ingExcl": "onions salad",  # 'Must not be included' ingredients (optional)
    #"sort": "re"                # Sorting options : 're' for relevance, 'ra' for rating, 'p' for popular (optional)
  }
  print(json.dumps((AllRecipes.search(query_options))))

sys.stdout.flush()

# query_options = {
#   "wt": "pork curry",         # Query keywords
# #   "ingIncl": "olives",        # 'Must be included' ingrdients (optional)
# #   "ingExcl": "onions salad",  # 'Must not be included' ingredients (optional)
# #   "sort": "re"                # Sorting options : 're' for relevance, 'ra' for rating, 'p' for popular (optional)
# }
# query_result = AllRecipes.search(query_options)

# print(query_result)

# # Get :
# main_recipe_url = query_result[0]['url']
# print(main_recipe_url)

# detailed_recipe = AllRecipes.get(main_recipe_url)  # Get the details of the first returned recipe (most relevant in our case)

# # Display result :
# print("## %s :" % detailed_recipe['name'])  # Name of the recipe

# for ingredient in detailed_recipe['ingredients']:  # List of ingredients
#   print("- %s" % ingredient)

# for step in detailed_recipe['steps']:  # List of cooking steps
#   print("# %s" % step)
